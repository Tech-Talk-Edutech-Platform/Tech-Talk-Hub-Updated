import { Calendar, ExternalLink, Trash2, User } from 'lucide-react'

import { RecordingLink } from '../../lib/classroom/recordingLink'
import { CopyRecordingLinkButton } from '../../components/recordings/CopyRecordingLinkButton'
import { RecordingThumbnail } from './RecordingThumbnail'
import {
  recordingDeletesOn,
  recordingKind,
  type CourseArt,
  type Recording,
} from './recordingsApi'

type RecordingCardProps = {
  recording: Recording
  course: CourseArt | null
  /** Staff see who it's for and the trial/regular tag. */
  showAudience: boolean
  onDelete?: () => void
  deleting?: boolean
}

const shortDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function audience(recording: Recording) {
  if (recording.student?.full_name) return recording.student.full_name
  if (recording.classroom_session_id) return 'Everyone in the class'
  if (recording.tutor_id) return 'The tutor’s students'
  return 'Staff only'
}

/** One recording in the library: picture, details and actions. */
export function RecordingCard({
  recording,
  course,
  showAudience,
  onDelete,
  deleting = false,
}: RecordingCardProps) {
  const kind = recordingKind(recording)
  const deletesOn = recordingDeletesOn(recording)

  return (
    <article className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-purple-500/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
        <RecordingThumbnail src={recording.thumbnail_url} course={course} />
        {showAudience && (
          <span
            className={`absolute top-2 left-2 rounded-md px-2 py-1 text-[10px] font-black tracking-wider uppercase shadow-sm ${
              kind === 'trial'
                ? 'bg-pink-600 text-white'
                : 'bg-white/90 text-slate-700'
            }`}
          >
            {kind === 'trial' ? 'Trial' : 'Regular'}
          </span>
        )}
        <RecordingLink
          recording={recording.recording_url}
          className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <span className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-medium text-white shadow-md transition-colors hover:bg-purple-500">
            <ExternalLink size={14} aria-hidden="true" /> Watch session
          </span>
        </RecordingLink>
      </div>

      <div className="flex-1 space-y-2">
        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 transition-colors group-hover:text-purple-600 dark:text-slate-100 dark:group-hover:text-purple-300">
          {recording.title}
        </h3>
        <dl className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400 dark:text-slate-500">Tutor</dt>
            <dd className="flex min-w-0 items-center gap-1 truncate font-medium text-slate-700 dark:text-slate-300">
              <User size={12} aria-hidden="true" className="shrink-0" />
              {recording.tutor?.full_name || 'Not set'}
            </dd>
          </div>
          {showAudience && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400 dark:text-slate-500">For</dt>
              <dd className="truncate font-medium text-slate-700 dark:text-slate-300">
                {audience(recording)}
              </dd>
            </div>
          )}
          {course && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400 dark:text-slate-500">Course</dt>
              <dd className="truncate font-medium text-slate-700 dark:text-slate-300">
                {course.title}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/80">
        <div className="min-w-0 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {recording.created_at && (
            <p className="flex items-center gap-1.5">
              <Calendar size={13} aria-hidden="true" />
              {shortDate.format(new Date(recording.created_at))}
            </p>
          )}
          {deletesOn && (
            <p className="mt-0.5" title="Recordings are kept for three months">
              Deleted on {shortDate.format(deletesOn)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <CopyRecordingLinkButton recordingId={recording.id} />
          {onDelete && (
            <button
              type="button"
              aria-label={`Delete ${recording.title}`}
              title="Delete recording"
              onClick={onDelete}
              disabled={deleting}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
