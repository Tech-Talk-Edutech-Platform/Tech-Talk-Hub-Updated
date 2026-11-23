import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '../../lib/queryClient'
import { supabase } from '../../supabase'
import type { Json } from '../../types/database'

/**
 * Lesson materials: the videos, pictures and documents tutors open inside a
 * training lesson (tutor_training_lessons.materials, migration
 * 20261124120000_tutor_training_materials.sql). Each is an upload in the
 * private tutor-training bucket or a link (YouTube, Loom, Vimeo, Google
 * Drive / Docs, any https:// address, or a page on this site).
 */

export const TRAINING_BUCKET = 'tutor-training'
/** The bucket's file_size_limit. */
export const MAX_UPLOAD_MB = 50
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
const MIGRATION = '20261124120000_tutor_training_materials.sql'

export type MaterialKind = 'video' | 'image' | 'document'

export const MATERIAL_KINDS: readonly MaterialKind[] = [
  'video',
  'image',
  'document',
]

export type TrainingMaterial = {
  id: string
  kind: MaterialKind
  title: string
  /** A caption, or what to look out for. */
  note: string
  /** An upload in the tutor-training bucket… */
  path: string | null
  /** …or a link. */
  url: string | null
  mime: string | null
  size: number | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const isKind = (value: unknown): value is MaterialKind =>
  typeof value === 'string' && MATERIAL_KINDS.some((kind) => kind === value)

/** Links tutors can open: https:// addresses and pages on this site. */
export const isOpenableUrl = (url: string) =>
  /^https:\/\//i.test(url) || /^\/(?!\/)/.test(url)

/** `materials` is free-form JSON in the database; keep only usable entries. */
export function parseMaterials(value: Json | undefined): TrainingMaterial[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, index) => {
    if (!isRecord(item) || !isKind(item.kind)) return []
    const path = text(item.path) || null
    const url = text(item.url) || null
    if (!path && !(url && isOpenableUrl(url))) return []
    return [
      {
        id: text(item.id) || `material-${index}`,
        kind: item.kind,
        title: text(item.title) || 'Untitled',
        note: text(item.note),
        path,
        url: path ? null : url,
        mime: text(item.mime) || null,
        size:
          typeof item.size === 'number' && item.size >= 0 ? item.size : null,
      },
    ]
  })
}

/** What's written to the database: no empty fields. */
export function serializeMaterials(materials: readonly TrainingMaterial[]) {
  return materials.map((material) => ({
    id: material.id,
    kind: material.kind,
    title: material.title.trim() || 'Untitled',
    ...(material.note.trim() ? { note: material.note.trim() } : {}),
    ...(material.path ? { path: material.path } : { url: material.url }),
    ...(material.mime ? { mime: material.mime } : {}),
    ...(material.size === null ? {} : { size: material.size }),
  }))
}

// ── File types ───────────────────────────────────────────────────────────

/** Matches the bucket's allowed_mime_types. */
const TYPE_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
}
const ALLOWED_TYPES = new Set(Object.values(TYPE_BY_EXTENSION))

/** For the file picker. */
export const UPLOAD_ACCEPT = Object.keys(TYPE_BY_EXTENSION)
  .map((extension) => `.${extension}`)
  .join(',')

const extensionOf = (name: string) =>
  name.includes('.') ? (name.split('.').pop() ?? '').toLowerCase() : ''

/** Browsers leave `type` empty for some Office files; fall back on the name. */
function fileType(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type
  return TYPE_BY_EXTENSION[extensionOf(file.name)] ?? null
}

const kindOfType = (type: string): MaterialKind =>
  type.startsWith('image/')
    ? 'image'
    : type.startsWith('video/')
      ? 'video'
      : 'document'

/** "Trial checklist v2.pdf" → "Trial checklist v2". */
const titleFromFileName = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .trim() || name

/** Object keys: keep them readable, and safe for every storage backend. */
const safeFileName = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(-80) || 'file'

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Why this file can't be uploaded, or null when it can. */
export function uploadProblem(file: File): string | null {
  if (!fileType(file)) {
    return `“${file.name}” isn’t a file type training can hold. Upload pictures (PNG, JPG, WebP, GIF), videos (MP4, WebM, MOV), PDFs, Word, PowerPoint, Excel or text files.`
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)}; uploads are limited to ${MAX_UPLOAD_MB} MB. Put long videos on YouTube (unlisted), Loom or Google Drive and add the link instead.`
  }
  return null
}

function storageMessage(error: { message: string }, file?: File): string {
  const message = error.message.toLowerCase()
  if (message.includes('bucket not found')) {
    return `Training uploads aren’t set up in the database yet (migration ${MIGRATION}).`
  }
  if (
    message.includes('row-level security') ||
    message.includes('unauthorized')
  ) {
    return 'Only admins can upload training files.'
  }
  if (
    message.includes('maximum allowed size') ||
    message.includes('too large')
  ) {
    return `${file ? `“${file.name}”` : 'That file'} is over the ${MAX_UPLOAD_MB} MB limit.`
  }
  if (message.includes('mime type')) {
    return `${file ? `“${file.name}”` : 'That file'} isn’t a file type training can hold.`
  }
  return error.message
}

/** Uploads one file and returns it as a material, ready to save. */
export async function uploadMaterialFile(
  file: File,
): Promise<TrainingMaterial> {
  const problem = uploadProblem(file)
  const type = fileType(file)
  if (problem || !type) throw new Error(problem ?? 'Unsupported file.')
  const path = `lessons/${crypto.randomUUID()}/${safeFileName(file.name)}`
  const { error } = await supabase.storage
    .from(TRAINING_BUCKET)
    .upload(path, file, { contentType: type, cacheControl: '3600' })
  if (error) throw new Error(storageMessage(error, file))
  return {
    id: crypto.randomUUID(),
    kind: kindOfType(type),
    title: titleFromFileName(file.name),
    note: '',
    path,
    url: null,
    mime: type,
    size: file.size,
  }
}

/** Best effort: a file left behind costs storage, not correctness. */
export async function removeMaterialFiles(paths: readonly string[]) {
  if (paths.length === 0) return
  const { error } = await supabase.storage
    .from(TRAINING_BUCKET)
    .remove([...paths])
  if (error) console.warn('Couldn’t delete training files:', error.message)
}

export const materialPaths = (materials: readonly TrainingMaterial[]) =>
  materials.flatMap((material) => (material.path ? [material.path] : []))

// ── Links ────────────────────────────────────────────────────────────────

export type Embed = {
  src: string
  provider:
    | 'YouTube'
    | 'Vimeo'
    | 'Loom'
    | 'Google Drive'
    | 'Google Docs'
    | 'Google Slides'
    | 'Google Sheets'
}

const ID = /^[\w-]{6,}$/

const GOOGLE_EDITORS: Record<string, Embed['provider']> = {
  document: 'Google Docs',
  presentation: 'Google Slides',
  spreadsheets: 'Google Sheets',
}

/** The embeddable player or viewer for a link, when there is one. */
export function embedFor(url: string): Embed | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^(www|m)\./, '')
  const parts = parsed.pathname.split('/').filter(Boolean)

  if (
    host === 'youtu.be' ||
    host.endsWith('youtube.com') ||
    host === 'youtube-nocookie.com'
  ) {
    const id =
      host === 'youtu.be'
        ? parts[0]
        : ['embed', 'shorts', 'live'].includes(parts[0] ?? '')
          ? parts[1]
          : parsed.searchParams.get('v')
    return id && ID.test(id)
      ? {
          provider: 'YouTube',
          src: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
        }
      : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const [first, second] = parts
    const id = first === 'video' ? second : first
    if (!id || !/^\d+$/.test(id)) return null
    // Unlisted videos carry a hash: vimeo.com/<id>/<hash> or ?h=<hash>.
    const hash = first === 'video' ? parsed.searchParams.get('h') : second
    const unlisted = hash && /^[\da-f]+$/i.test(hash) ? `?h=${hash}` : ''
    return {
      provider: 'Vimeo',
      src: `https://player.vimeo.com/video/${id}${unlisted}`,
    }
  }
  if (host === 'loom.com') {
    const id = ['share', 'embed'].includes(parts[0] ?? '') ? parts[1] : null
    return id && ID.test(id)
      ? { provider: 'Loom', src: `https://www.loom.com/embed/${id}` }
      : null
  }
  if (host === 'drive.google.com' && parts[0] === 'file' && parts[1] === 'd') {
    const id = parts[2]
    return id && ID.test(id)
      ? {
          provider: 'Google Drive',
          src: `https://drive.google.com/file/d/${id}/preview`,
        }
      : null
  }
  if (host === 'docs.google.com' && parts[1] === 'd') {
    const provider = GOOGLE_EDITORS[parts[0] ?? '']
    const id = parts[2]
    return provider && id && ID.test(id)
      ? {
          provider,
          src: `https://docs.google.com/${parts[0]}/d/${id}/preview`,
        }
      : null
  }
  return null
}

/** A sensible kind for a pasted link; the admin can change it. */
export function guessKind(url: string): MaterialKind {
  const embed = embedFor(url)
  if (embed) {
    return ['YouTube', 'Vimeo', 'Loom'].includes(embed.provider)
      ? 'video'
      : 'document'
  }
  const extension = extensionOf(url.split(/[?#]/)[0] ?? '')
  const type = TYPE_BY_EXTENSION[extension]
  return type ? kindOfType(type) : 'document'
}

/** "Trial checklist" from ".../trial-checklist.pdf", else the site's name. */
export function titleFromUrl(url: string): string {
  const embed = embedFor(url)
  if (embed) {
    return embed.provider.startsWith('Google')
      ? embed.provider
      : `${embed.provider} video`
  }
  try {
    const parsed = new URL(url, window.location.origin)
    const last = parsed.pathname.split('/').findLast(Boolean)
    if (last) {
      return titleFromFileName(decodeURIComponent(last)).replace(/-+/g, ' ')
    }
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return 'Link'
  }
}

/** PDFs and Google files open inside the lesson; other documents download. */
export function canPreview(material: TrainingMaterial): boolean {
  if (material.url && embedFor(material.url)) return true
  if (material.mime === 'application/pdf') return true
  return Boolean(material.url && /\.pdf($|[?#])/i.test(material.url))
}

/** "PDF · 2.4 MB", "YouTube", "Word document". */
export function describeMaterial(material: TrainingMaterial): string {
  const embed = material.url ? embedFor(material.url) : null
  if (embed) return embed.provider
  const source =
    material.mime ?? TYPE_BY_EXTENSION[extensionOf(material.url ?? '')] ?? ''
  const label = source.includes('pdf')
    ? 'PDF'
    : source.includes('word')
      ? 'Word document'
      : source.includes('presentation') || source.includes('powerpoint')
        ? 'PowerPoint'
        : source.includes('sheet') || source.includes('excel')
          ? 'Spreadsheet'
          : source.startsWith('video/')
            ? 'Video'
            : source.startsWith('image/')
              ? 'Picture'
              : source.startsWith('text/')
                ? 'Text file'
                : material.url
                  ? 'Link'
                  : 'File'
  return material.size === null
    ? label
    : `${label} · ${formatBytes(material.size)}`
}

// ── Signed links ─────────────────────────────────────────────────────────

const SIGNED_FOR_SECONDS = 2 * 60 * 60

async function signPaths(paths: readonly string[]) {
  const { data, error } = await supabase.storage
    .from(TRAINING_BUCKET)
    .createSignedUrls([...paths], SIGNED_FOR_SECONDS)
  if (error) throw new Error(storageMessage(error))
  const urls: Record<string, string> = {}
  for (const item of data) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl
  }
  return urls
}

/**
 * Where each material can be opened: a signed link for uploads (the bucket
 * is private), the link itself otherwise. Null while a signed link loads.
 */
export function useMaterialUrls(materials: readonly TrainingMaterial[]) {
  const paths = materialPaths(materials).toSorted()
  const query = useQuery({
    queryKey: queryKeys.training.signedUrls(paths),
    queryFn: () => signPaths(paths),
    enabled: paths.length > 0,
    // Re-sign well before the links run out.
    staleTime: (SIGNED_FOR_SECONDS - 15 * 60) * 1000,
    refetchInterval: (SIGNED_FOR_SECONDS - 15 * 60) * 1000,
  })
  return {
    urlOf: (material: TrainingMaterial): string | null =>
      material.path ? (query.data?.[material.path] ?? null) : material.url,
    error: query.error,
  }
}
