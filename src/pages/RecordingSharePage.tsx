import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, ExternalLink, User, Video } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuthUser } from '../hooks/useAuthUser'
import {
  isExternalRecording,
  useRecordingUrl,
} from '../lib/classroom/recordingUrl'
import { rememberReturnPath } from '../lib/classroom/recordingShare'
import { CopyRecordingLinkButton } from '../components/recordings/CopyRecordingLinkButton'
import type { Tables } from '../types/database'

type SharedRecording = Tables<'class_recordings'> & {
  tutor: Pick<Tables<'users'>, 'full_name'> | null
}

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; recording: SharedRecording }

/**
 * `/recordings/<id>`: the page a copied recording link opens. Visitors sign
 * in first; the database then only returns the recording to people allowed
 * to see it (admins, the tutor who taught it, and the student(s) it's for).
 */
export default function RecordingSharePage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { user, loading } = useAuthUser()

  if (loading)
    return (
      <Shell>
        <Spinner />
      </Shell>
    )

  if (!user) {
    rememberReturnPath(location.pathname)
    return <Navigate to="/login" replace />
  }

  return (
    <Shell>
      <RecordingLoader id={id} userId={user.id} />
    </Shell>
  )
}

function RecordingLoader({ id, userId }: { id: string; userId: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [dashboardPath, setDashboardPath] = useState('/login')

  useEffect(() => {
    let active = true
    void Promise.all([
      supabase
        .from('class_recordings')
        .select('*, tutor:users!tutor_id(full_name)')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('users').select('role').eq('id', userId).maybeSingle(),
    ]).then(([recording, profile]) => {
      if (!active) return
      if (profile.data?.role) setDashboardPath(`/${profile.data.role}`)
      setState(
        recording.data
          ? { status: 'ready', recording: recording.data }
          : { status: 'missing' },
      )
    })
    return () => {
      active = false
    }
  }, [id, userId])

  const backLink = (
    <Link
      to={dashboardPath}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:underline dark:text-purple-400"
    >
      <ArrowLeft size={16} /> Back to my dashboard
    </Link>
  )

  if (state.status === 'loading') return <Spinner />

  if (state.status === 'missing') {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <Video size={22} />
        </div>
        <h1 className="text-lg font-bold">Recording not available</h1>
        <p className="mx-auto max-w-sm text-sm text-slate-600 dark:text-slate-400">
          This recording was removed, or it isn’t shared with the account you’re
          signed in with.
        </p>
        {backLink}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {backLink}
      <RecordingPlayer recording={state.recording} />
    </div>
  )
}

function RecordingPlayer({ recording }: { recording: SharedRecording }) {
  const external = isExternalRecording(recording.recording_url)
  const { url, isError } = useRecordingUrl(recording.recording_url)

  return (
    <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-950">
        {isError ? (
          <p className="px-6 text-center text-sm text-slate-300">
            You don’t have access to this recording’s video.
          </p>
        ) : external ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-500"
          >
            <ExternalLink size={16} /> Open recording
          </a>
        ) : url ? (
          // Class recordings have no caption track to offer.
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={url} controls className="h-full w-full" />
        ) : (
          <Spinner />
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-xl font-bold break-words">{recording.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {recording.tutor?.full_name && (
              <span className="inline-flex items-center gap-1">
                <User size={13} /> {recording.tutor.full_name}
              </span>
            )}
            {recording.created_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={13} />
                {new Date(recording.created_at).toLocaleDateString(undefined, {
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

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-12 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl">{children}</div>
    </main>
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
