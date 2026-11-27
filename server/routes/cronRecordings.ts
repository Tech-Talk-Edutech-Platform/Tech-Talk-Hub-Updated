import express, { type Request, type Response } from 'express'
import { supabase } from '../supabase'

/**
 * /api/cron/recordings: deletes class recordings older than three months,
 * with their video files in the private 'class-recordings' bucket.
 *
 * Call it once a day from a scheduler (Vercel Cron, or Supabase pg_cron with
 * pg_net), sending `Authorization: Bearer <CRON_SECRET>` like
 * /api/cron/reminders. Add `?dryRun=1` to see what would go without deleting
 * anything. Each run handles up to BATCH recordings; a backlog clears over a
 * few days.
 *
 * Every recording card shows the date it will be deleted, so tutors and
 * students know to save anything they want to keep.
 */
const router = express.Router()

const RECORDINGS_BUCKET = 'class-recordings'
export const RETENTION_MONTHS = 3
const BATCH = 500
/** Storage removes at most this many files per request. */
const REMOVE_CHUNK = 100

const isWebUrl = (value: string) => /^https?:\/\//i.test(value)

function retentionCutoff(now = new Date()) {
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS)
  return cutoff
}

async function run(req: Request, res: Response): Promise<void> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    res.status(503).json({ error: 'CRON_SECRET is not configured.' })
    return
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true'
  const cutoff = retentionCutoff()

  const { data, error } = await supabase
    .from('class_recordings')
    .select('id, recording_url')
    .lt('created_at', cutoff.toISOString())
    .order('created_at', { ascending: true })
    .limit(BATCH)
  if (error) {
    console.error('Recording clean-up: listing failed:', error.message)
    res.status(500).json({ error: 'Couldn’t list old recordings.' })
    return
  }

  const rows = data ?? []
  const files = rows
    .map((row) => row.recording_url)
    .filter((url) => !isWebUrl(url))
  if (dryRun || rows.length === 0) {
    res.json({
      ok: true,
      dryRun,
      cutoff: cutoff.toISOString(),
      recordings: rows.length,
      files: files.length,
    })
    return
  }

  // Files first: a row is only deleted once its file is gone, so a failed
  // run is simply retried tomorrow.
  const chunks: string[][] = []
  for (let start = 0; start < files.length; start += REMOVE_CHUNK) {
    chunks.push(files.slice(start, start + REMOVE_CHUNK))
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase.storage.from(RECORDINGS_BUCKET).remove(chunk),
    ),
  )
  const removedPaths = new Set<string>()
  results.forEach((removed, index) => {
    if (removed.error) {
      console.error('Recording clean-up: file removal failed:', removed.error)
      return
    }
    // Paths already missing count as removed: nothing left to keep.
    for (const path of chunks[index]) removedPaths.add(path)
  })
  const deletable = rows
    .filter(
      (row) =>
        isWebUrl(row.recording_url) || removedPaths.has(row.recording_url),
    )
    .map((row) => row.id)

  if (deletable.length > 0) {
    const { error: deleteError } = await supabase
      .from('class_recordings')
      .delete()
      .in('id', deletable)
    if (deleteError) {
      console.error('Recording clean-up: row deletion failed:', deleteError)
      res.status(500).json({ error: 'Couldn’t delete old recordings.' })
      return
    }
  }

  res.json({
    ok: true,
    dryRun: false,
    cutoff: cutoff.toISOString(),
    recordings: deletable.length,
    files: removedPaths.size,
    skipped: rows.length - deletable.length,
  })
}

// Vercel Cron sends GET; other schedulers usually POST.
router.get('/', (req, res) => void run(req, res))
router.post('/', (req, res) => void run(req, res))

export default router
