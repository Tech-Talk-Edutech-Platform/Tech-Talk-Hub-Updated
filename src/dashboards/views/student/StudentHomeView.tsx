import { InsightsError, InsightsStale } from '../../insights/InsightsError'
import type { DashboardNavigation } from '../../navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../supabase'
import {
  Sparkles,
  Calendar,
  Video,
  PlayCircle,
  GraduationCap,
  ExternalLink,
} from 'lucide-react'
import { RecordingLink } from '../../../lib/classroom/recordingLink'
import { EmptyState } from '../../../components/ui/EmptyState'
import { StudentInsights } from '../../insights/StudentInsights'
import { CopyRecordingLinkButton } from '../../../components/recordings/CopyRecordingLinkButton'
import type { Tables } from '../../../types/database'
import { StudentBadgesCard } from './StudentClassroomView'
import { Avatar } from '../../../components/ui/Avatar'
import { useMyProfile } from '../../../hooks/useMyProfile'

type RecordingWithTutor = Tables<'class_recordings'> & {
  tutor: Pick<Tables<'users'>, 'full_name'> | null
}

export default function StudentHomeView({
  userId,
  onNavigate,
  onOpenRecordings,
}: {
  userId: string
  onNavigate?: DashboardNavigation
  onOpenRecordings: () => void
}) {
  const { profile } = useMyProfile(userId)
  const assessment = useQuery({
    queryKey: ['dashboard', 'latest-student-assessment', userId],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('student_results')
        .select('overall_score')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw error
      return data?.overall_score ?? null
    },
  })
  const recordings = useQuery({
    queryKey: ['dashboard', 'student-home-recordings', userId],
    queryFn: async ({ signal }): Promise<RecordingWithTutor[]> => {
      const { data, error } = await supabase
        .from('class_recordings')
        .select('*, tutor:users!class_recordings_tutor_id_fkey (full_name)')
        // Row-level security returns only this student's recordings.
        .order('created_at', { ascending: false })
        .limit(3)
        .abortSignal(signal)
      if (error) throw error
      return data
    },
  })
  const latestRecordings = recordings.data ?? []
  const studentAvatar = profile.data?.avatar_url
  const studentName = profile.data?.full_name || 'Student'
  const firstName = studentName.split(' ')[0]

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f7ff] text-gray-900 transition-colors duration-300 dark:bg-dashboard-night dark:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 h-[500px] w-[500px] bg-purple-600/20 blur-[120px] dark:bg-purple-600/15" />
        <div className="absolute right-0 bottom-0 h-[500px] w-[500px] bg-indigo-600/15 blur-[140px] dark:bg-indigo-600/10" />
      </div>

      <div className="animate-fade-in relative z-10 mx-auto max-w-7xl space-y-8 p-4 md:p-6 lg:p-8">
        {/* WELCOME BANNER HEADER */}
        <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[25px] border border-purple-700/30 bg-linear-to-r from-purple-900 via-purple-800 to-indigo-900 p-6 text-white shadow-2xl sm:rounded-[30px] sm:p-8 md:rounded-[35px] lg:flex-row lg:items-center">
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-[10px] font-black tracking-widest text-purple-200 uppercase backdrop-blur-md">
              <Sparkles size={12} className="animate-spin text-pink-400" />{' '}
              Student Dashboard ⭐
            </div>

            <div className="flex items-center gap-4">
              <Avatar
                name={studentName}
                src={studentAvatar}
                userRole="student"
                size={48}
                className="ring-2 ring-pink-400/60"
              />
              <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                Welcome back, <span className="text-pink-300">{firstName}</span>{' '}
                💜
              </h1>
            </div>

            <p className="max-w-xl text-xs font-medium text-purple-200 sm:text-sm">
              Continue your courses, track your learning progress, and unlock
              new achievements today.
            </p>
            {assessment.data != null && (
              <p className="text-sm font-semibold">
                Latest assessment score: {assessment.data}%
              </p>
            )}
          </div>
        </div>

        <StudentInsights studentId={userId} onNavigate={onNavigate} />

        {/* The next class (with Join) is in the insights above; the full
            upcoming list lives in My Classroom › Upcoming. */}

        {/* Badges given in class (users.badges) */}
        <StudentBadgesCard userId={userId} />

        {/* RECENT CLASS RECORDINGS SECTION */}
        <div className="rounded-[32px] border border-purple-200/60 bg-white/90 p-6 shadow-xl backdrop-blur-2xl md:p-8 dark:border-purple-500/25 dark:bg-white/5">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
                <Video size={20} />
              </div>
              <h3 className="text-lg font-black tracking-tight">
                Class Recordings
              </h3>
            </div>
            <button
              type="button"
              onClick={onOpenRecordings}
              className="cursor-pointer text-xs font-bold text-purple-600 hover:underline dark:text-purple-400"
            >
              View all
            </button>
          </div>

          {recordings.isError && recordings.data && (
            <InsightsStale onRetry={() => void recordings.refetch()} />
          )}
          {recordings.isPending ? (
            <output>Loading recordings…</output>
          ) : recordings.isError && !recordings.data ? (
            <InsightsError
              title="Recordings could not be loaded"
              error={recordings.error}
              onRetry={() => void recordings.refetch()}
            />
          ) : latestRecordings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestRecordings.map((recording) => {
                const resolvedTutorName =
                  recording.tutor?.full_name || 'Assigned Tutor'

                return (
                  <div
                    key={recording.id}
                    className="flex flex-col justify-between space-y-4 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 transition-all hover:border-purple-400/40 dark:border-purple-500/20 dark:bg-purple-950/20"
                  >
                    {recording.recording_url ? (
                      <RecordingLink
                        recording={recording.recording_url}
                        className="group relative block flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-black/80 shadow-md"
                      >
                        {recording.thumbnail_url ? (
                          <img
                            src={recording.thumbnail_url}
                            alt={recording.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : null}

                        <div
                          className={`absolute inset-0 ${recording.thumbnail_url ? 'bg-black/40 group-hover:bg-black/20' : 'bg-purple-900/20 group-hover:bg-purple-900/0'} flex items-center justify-center transition-colors`}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600/90 text-white shadow-lg transition-transform group-hover:scale-110">
                            <PlayCircle size={28} />
                          </div>
                        </div>

                        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-sm bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                          Watch Session <ExternalLink size={10} />
                        </span>
                      </RecordingLink>
                    ) : (
                      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black/80 shadow-md">
                        <div className="flex flex-col items-center gap-2 text-xs text-gray-400">
                          <PlayCircle size={32} />
                          <span>Video link unavailable</span>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-block rounded-full bg-purple-600/15 px-3 py-1 text-[10px] font-black tracking-wider text-purple-700 uppercase dark:text-purple-300">
                          Live Session
                        </span>
                        {recording.created_at && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-pink-500">
                            <Calendar size={10} />
                            {new Date(recording.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              },
                            )}
                          </span>
                        )}
                      </div>

                      <h4 className="line-clamp-1 text-base font-extrabold">
                        {recording.title || 'Catch up on what you missed!'}
                      </h4>

                      <div className="mt-2 flex flex-col gap-1 border-t border-purple-100 pt-1 text-[11px] text-gray-600 dark:border-purple-500/15 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap
                            size={14}
                            className="shrink-0 text-purple-500"
                          />
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            Tutor:
                          </span>
                          <span className="font-semibold">
                            {resolvedTutorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="pl-5 font-bold text-purple-600 dark:text-purple-400">
                            Student:
                          </span>
                          <span>{studentName}</span>
                        </div>
                      </div>
                    </div>

                    <CopyRecordingLinkButton
                      recordingId={recording.id}
                      className="self-start"
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              size="sm"
              tone="brand"
              icon={Video}
              title="No recordings yet"
              description="Recordings appear here after your next live session."
            />
          )}
        </div>
      </div>
    </div>
  )
}
