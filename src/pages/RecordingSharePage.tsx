import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, ExternalLink, User, Video } from 'lucide-react'
import { apiUrl } from '../lib/apiUrl'
import { CopyRecordingLinkButton } from '../components/recordings/CopyRecordingLinkButton'

/** What `GET /api/recordings/:id` returns (see server/routes/recordings.ts). */
type SharedRecording = {
  id: string
  title: string
  createdAt: string | null
  tutorName: string | null
  url: string
  external: boolean
}

class RecordingRequestError extends Error {
  constructor(
    message: string,
    readonly notFound: boolean,
  ) {
    super(message)
  }
}

async function fetchSharedRecording(id: string): Promise<SharedRecording> {
  const response = await fetch(
    apiUrl(`/api/recordings/${encodeURIComponent(id)}`),
  )
  if (!response.ok) {
    throw new RecordingRequestError(
      `Recording request failed (${response.status})`,
      response.status === 404,
    )
  }
  const body: unknown = await response.json()
  if (!isSharedRecording(body)) {
    throw new RecordingRequestError('Unexpected recording response', false)
  }
  return body
}

function isSharedRecording(value: unknown): value is SharedRecording {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'url' in value &&
    typeof value.url === 'string' &&
    'external' in value &&
    typeof value.external === 'boolean'
  )
}

/**
 * `/recordings/<id>`: the public page a copied recording link opens. Anyone
 * with the link can watch, signed in or not. The server hands out the video
 * (a signed link that expires, for classroom recordings).
 */
export default function RecordingSharePage() {
  const { id = '' } = useParams()
  const recording = useQuery({
    queryKey: ['shared-recording', id],
    queryFn: () => fetchSharedRecording(id),
    // A new URL would restart the video, so only fetch again when asked to.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: (failures, error) =>
      !(error instanceof RecordingRequestError && error.notFound) &&
      failures < 2,
  })

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:py-10 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link
          to="/"
          className="inline-block bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-lg font-black tracking-tight text-transparent"
        >
          Tech Talk Hub
        </Link>

        {recording.isPending ? (
          <Spinner />
        ) : recording.isError ? (
          <Unavailable
            notFound={
              recording.error instanceof RecordingRequestError &&
              recording.error.notFound
            }
            onRetry={() => void recording.refetch()}
          />
        ) : (
          <RecordingPlayer
            recording={recording.data}
            onExpired={() => recording.refetch()}
          />
        )}
      </div>
    </main>
  )
}

function RecordingPlayer({
  recording,
  onExpired,
}: {
  recording: SharedRecording
  onExpired: () => Promise<unknown>
}) {
  const video = useRef<HTMLVideoElement>(null)
  // Where to pick up again after swapping in a fresh link.
  const resumeAt = useRef<number | null>(null)

  // A classroom video's link expires after a few hours. If it stops working
  // mid-watch, get a new one and carry on from the same spot.
  const handleError = () => {
    if (resumeAt.current !== null) return
    resumeAt.current = video.current?.currentTime ?? 0
    void onExpired()
  }

  const handleLoaded = () => {
    if (video.current && resumeAt.current) {
      video.current.currentTime = resumeAt.current
      void video.current.play().catch(() => undefined)
    }
    resumeAt.current = null
  }

  return (
    <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-950">
        {recording.external ? (
          <a
            href={recording.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-500"
          >
            <ExternalLink size={16} /> Open recording
          </a>
        ) : (
          // Class recordings have no caption track to offer.
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={video}
            src={recording.url}
            controls
            playsInline
            preload="metadata"
            onError={handleError}
            onLoadedMetadata={handleLoaded}
            className="h-full w-full"
          />
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-xl font-bold break-words">{recording.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {recording.tutorName && (
              <span className="inline-flex items-center gap-1">
                <User size={13} /> {recording.tutorName}
              </span>
            )}
            {recording.createdAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={13} />
                {new Date(recording.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
        <CopyRecordingLinkButton recordingId={recording.id} />
      </div>
    </article>
  )
}

function Unavailable({
  notFound,
  onRetry,
}: {
  notFound: boolean
  onRetry: () => void
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Video size={22} />
      </div>
      <h1 className="text-lg font-bold">
        {notFound ? 'Recording not available' : 'Couldn’t load this recording'}
      </h1>
      <p className="mx-auto max-w-sm text-sm text-slate-600 dark:text-slate-400">
        {notFound
          ? 'This link is wrong, or the recording has been removed.'
          : 'Something went wrong on our side. Please try again in a moment.'}
      </p>
      {!notFound && (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
        >
          Try again
        </button>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <output
        aria-label="Loading recording"
        className="block h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"
      />
    </div>
  )
}
