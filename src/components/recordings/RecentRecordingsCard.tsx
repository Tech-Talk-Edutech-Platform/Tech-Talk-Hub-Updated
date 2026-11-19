import { useEffect, useState } from 'react'
import { ChevronRight, PlayCircle, Video } from 'lucide-react'
import { supabase } from '../../supabase'
import { RecordingLink } from '../../lib/classroom/recordingLink'
import { CopyRecordingLinkButton } from './CopyRecordingLinkButton'
import type { Tables } from '../../types/database'

type RecentRecording = Pick<
  Tables<'class_recordings'>,
  'id' | 'title' | 'recording_url' | 'created_at'
> & {
  tutor: Pick<Tables<'users'>, 'full_name'> | null
  student: Pick<Tables<'users'>, 'full_name'> | null
}

const LIMIT = 4

/**
 * The latest recordings on a dashboard home page. Row-level security decides
 * which ones come back: everything for admins, a tutor's own classes for
 * tutors.
 */
export function RecentRecordingsCard({
  onViewAll,
  showTutor = true,
}: {
  onViewAll: () => void
  showTutor?: boolean
}) {
  const [recordings, setRecordings] = useState<RecentRecording[] | null>(null)

  useEffect(() => {
    let active = true
    void supabase
      .from('class_recordings')
      .select(
        'id, title, recording_url, created_at, tutor:users!tutor_id(full_name), student:users!student_id(full_name)',
      )
      .order('created_at', { ascending: false })
      .limit(LIMIT)
      .then(({ data }) => {
        if (active) setRecordings(data ?? [])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-xs md:p-8 dark:border-white/10 dark:bg-white/5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
          <Video size={16} className="text-purple-600 dark:text-purple-400" />
          Recent Recordings
        </h3>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex cursor-pointer items-center gap-0.5 text-xs font-bold text-purple-600 hover:underline dark:text-purple-400"
        >
          View all <ChevronRight size={14} />
        </button>
      </div>

      {recordings === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5"
            />
          ))}
        </div>
      ) : recordings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-bold text-gray-400">
            No recordings yet. Recorded classes show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {recordings.map((rec) => (
            <li
              key={rec.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/30 p-3 sm:flex-nowrap dark:border-white/10 dark:bg-white/5"
            >
              <RecordingLink
                recording={rec.recording_url}
                aria-label={`Watch ${rec.title}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white transition-colors hover:bg-purple-500"
              >
                <PlayCircle size={20} />
              </RecordingLink>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-gray-900 dark:text-white">
                  {rec.title}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                  {[
                    showTutor ? rec.tutor?.full_name : null,
                    rec.student?.full_name || 'All students',
                    rec.created_at
                      ? new Date(rec.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <CopyRecordingLinkButton recordingId={rec.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
