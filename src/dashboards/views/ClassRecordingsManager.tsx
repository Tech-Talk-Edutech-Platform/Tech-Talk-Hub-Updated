import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Sparkles, Video } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { InsightsError } from '../insights/InsightsError'
import { isAdminRole, type AppRole } from '../../types/roles'
import { getErrorMessage } from '../../lib/getErrorMessage'
import { RecordingCard } from '../../features/recordings/RecordingCard'
import { RecordingFilters } from '../../features/recordings/RecordingFilters'
import { UploadRecordingModal } from '../../features/recordings/UploadRecordingModal'
import {
  deleteRecording,
  loadRecordingLibrary,
  recordingKeys,
  recordingKind,
  NO_FILTERS,
  RECORDING_RETENTION_MONTHS,
  type RecordingFilterState,
  type Recording,
  type RecordingLibrary,
} from '../../features/recordings/recordingsApi'

type ClassRecordingsManagerProps = {
  userId: string
  role: AppRole
}

/** Whether a recording passes the filters (everything but trial/regular). */
function matchesFilters(recording: Recording, filters: RecordingFilterState) {
  const query = filters.search.trim().toLowerCase()
  const text = [
    recording.title,
    recording.tutor?.full_name,
    recording.student?.full_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return (
    (!query || text.includes(query)) &&
    (!filters.tutorId || recording.tutor_id === filters.tutorId) &&
    (!filters.studentId || recording.student_id === filters.studentId)
  )
}

/** The course whose picture stands in for a missing thumbnail. */
function courseFor(recording: Recording, library: RecordingLibrary) {
  const courseId =
    recording.student?.assigned_course_id ?? library.viewerCourseId
  return library.courses.find((course) => course.id === courseId) ?? null
}

/**
 * Dashboard › Recordings. Admins see every recording and filter by trial or
 * regular class, tutor and student; tutors see the classes they taught and
 * upload more; students see only their own. Row-level security enforces it.
 */
export default function ClassRecordingsManager({
  userId,
  role,
}: ClassRecordingsManagerProps) {
  const admin = isAdminRole(role)
  const staff = role !== 'student'
  const client = useQueryClient()
  const key = recordingKeys.library(userId, role)
  const library = useQuery({
    queryKey: key,
    queryFn: () => loadRecordingLibrary(userId, role),
  })
  const [filters, setFilters] = useState<RecordingFilterState>(NO_FILTERS)
  const [uploading, setUploading] = useState(false)

  const remove = useMutation({
    mutationFn: deleteRecording,
    onSuccess: () => {
      toast.success('Recording deleted.')
      void client.invalidateQueries({ queryKey: key })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Couldn’t delete the recording.')),
  })

  const all = library.data?.recordings ?? []
  const matching = all.filter((recording) => matchesFilters(recording, filters))
  const counts = {
    all: matching.length,
    regular: matching.filter((r) => recordingKind(r) === 'regular').length,
    trial: matching.filter((r) => recordingKind(r) === 'trial').length,
  }
  const shown =
    filters.kind === 'all'
      ? matching
      : matching.filter((r) => recordingKind(r) === filters.kind)
  const filtering =
    filters.search !== '' ||
    filters.kind !== 'all' ||
    filters.tutorId !== '' ||
    filters.studentId !== ''

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-8 bg-slate-50 p-4 text-slate-900 md:p-10 dark:bg-slate-950 dark:text-slate-100">
      <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs md:flex-row md:items-center md:p-8 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-600 dark:border-purple-500/25 dark:bg-purple-500/10 dark:text-purple-400">
            <Sparkles size={13} aria-hidden="true" /> Session library
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
            {admin ? 'Class Recordings' : 'My Class Recordings'}
          </h2>
          <p className="max-w-xl text-sm text-slate-600 dark:text-slate-400">
            {admin
              ? 'Every recording on the platform. Filter by trial or regular class, tutor and student.'
              : staff
                ? 'Recordings of the classes you taught. Upload one, or use “Copy link” to share it with a student or parent.'
                : 'Watch your past classes again. Use “Copy link” to share one with family.'}{' '}
            Recordings are kept for {RECORDING_RETENTION_MONTHS} months.
          </p>
        </div>
        {staff && (
          <button
            type="button"
            onClick={() => setUploading(true)}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-purple-700 dark:hover:bg-purple-500"
          >
            <Plus size={18} aria-hidden="true" /> Add recording
          </button>
        )}
      </div>

      <RecordingFilters
        value={filters}
        onChange={setFilters}
        counts={counts}
        showKind={staff}
        tutors={library.data?.tutors ?? []}
        students={admin ? (library.data?.students ?? []) : []}
        shown={shown.length}
      />

      {library.isError ? (
        <InsightsError
          title="Recordings could not be loaded"
          error={library.error}
          onRetry={() => void library.refetch()}
        />
      ) : library.isPending ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex h-72 animate-pulse flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/30"
            >
              <div className="aspect-video rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="space-y-2">
                <div className="h-4 w-1/3 rounded-sm bg-slate-100 dark:bg-slate-800" />
                <div className="h-5 w-3/4 rounded-sm bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : shown.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((recording) => (
            <RecordingCard
              key={recording.id}
              recording={recording}
              course={courseFor(recording, library.data)}
              showAudience={staff}
              deleting={
                remove.isPending && remove.variables.id === recording.id
              }
              onDelete={
                staff
                  ? () => {
                      if (
                        window.confirm(
                          `Delete “${recording.title}”? Its share link stops working.`,
                        )
                      ) {
                        remove.mutate(recording)
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-xs dark:border-slate-800 dark:bg-slate-900/20 dark:text-slate-400">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            <Video size={20} aria-hidden="true" />
          </div>
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {filtering
              ? 'No recordings match these filters.'
              : staff
                ? 'No recordings yet. Classes you record, and recordings you add, show up here.'
                : 'No recordings yet. Your recorded classes show up here.'}
          </p>
          {filtering && (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="cursor-pointer text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {staff && uploading && library.data && (
        <UploadRecordingModal
          userId={userId}
          admin={admin}
          students={library.data.students}
          tutors={library.data.tutors}
          onClose={() => setUploading(false)}
          onSaved={() => {
            setUploading(false)
            toast.success('Recording saved.')
            void client.invalidateQueries({ queryKey: key })
          }}
        />
      )}
    </div>
  )
}
