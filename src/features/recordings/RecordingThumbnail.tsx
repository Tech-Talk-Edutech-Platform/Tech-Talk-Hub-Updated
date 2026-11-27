import { useState } from 'react'
import { Video } from 'lucide-react'

import type { CourseArt } from './recordingsApi'

type RecordingThumbnailProps = {
  /** The thumbnail set on the recording, if any. */
  src: string | null
  /** The student's course, used when the recording has no thumbnail. */
  course: CourseArt | null
}

/** Background tones for courses without artwork, picked by course name. */
const TONES = [
  'from-purple-600 to-indigo-700',
  'from-pink-500 to-rose-600',
  'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-600',
]

function toneFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return TONES[Math.abs(hash) % TONES.length]
}

/**
 * A recording's picture: its own thumbnail, else its course's artwork (a
 * Coding class shows the Coding course image), else a tile in the course's
 * colour with the course name.
 */
export function RecordingThumbnail({ src, course }: RecordingThumbnailProps) {
  const [failed, setFailed] = useState<string | null>(null)
  const image = [src, course?.thumbnail_url].find(
    (url): url is string => Boolean(url?.trim()) && url !== failed,
  )

  if (image) {
    return (
      <img
        src={image}
        alt=""
        loading="lazy"
        onError={() => setFailed(image)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    )
  }

  const label = course?.title ?? 'Class recording'
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-linear-to-br p-4 text-center text-white ${toneFor(label)}`}
      aria-hidden="true"
    >
      <Video size={32} className="opacity-80" />
      <span className="line-clamp-2 text-sm font-black tracking-tight">
        {label}
      </span>
    </div>
  )
}
