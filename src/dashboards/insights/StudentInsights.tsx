import type { DashboardNavigation } from '../navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  PlayCircle,
  Target,
} from 'lucide-react'

import { KpiCard } from '../../components/dashboard/ui/KpiCard'
import { ChartCard } from '../../components/dashboard/ui/ChartCard'
import { formatRelative } from '../../components/dashboard/period'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { queryKeys } from '../../lib/queryClient'
import {
  loadScheduledClasses,
  loadStudentInsights,
  studentClassroomSessions,
} from './studentInsights'
import { useStudentInvites } from './useStudentInvites'
import { InsightsError, InsightsStale } from './InsightsError'
import { NavButton } from './NavButton'
import { ProgressBar } from './bits'
import { ClassCalendarCard, NextClassCard } from './StudentClasses'

/** A student's progress, next class, calendar and what to do next. */
export function StudentInsights({
  studentId,
  onNavigate,
}: {
  studentId: string
  onNavigate?: DashboardNavigation
}) {
  const query = useQuery({
    queryKey: queryKeys.dashboard.student(studentId),
    queryFn: () => loadStudentInsights(studentId),
    staleTime: 60_000,
  })
  const data = query.data
  const loading = query.isPending
  const currentCourse = data?.course
  const nextLesson = data?.nextLesson

  const schedule = useQuery({
    queryKey: ['dashboard', 'student-classes', studentId],
    queryFn: () => loadScheduledClasses(studentId),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  const invites = useStudentInvites(studentId)
  const classesLoading = schedule.isPending || invites.isPending
  const missingClassSource =
    (schedule.isError && !schedule.data) || (invites.isError && !invites.data)
  const classes = [
    ...(schedule.data ?? []),
    ...studentClassroomSessions(invites.data ?? []),
  ].toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  const classesUnavailable = missingClassSource && classes.length === 0
  const classRefreshFailed = schedule.isError || invites.isError
  const retryClasses = () => {
    void schedule.refetch()
    void invites.refetch()
  }

  const classStatus =
    missingClassSource && !classesUnavailable ? (
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <output>Some classes could not be loaded.</output>
        <Button size="sm" variant="outline" onClick={retryClasses}>
          Try again
        </Button>
      </div>
    ) : classRefreshFailed && !classesUnavailable ? (
      <InsightsStale onRetry={retryClasses} />
    ) : null

  return (
    <section aria-label="My learning" className="space-y-6">
      {query.isError && !data ? (
        <InsightsError onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <InsightsStale onRetry={() => void query.refetch()} />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Course progress"
              icon={Target}
              accent="purple"
              loading={loading}
              value={data?.progress === null ? '—' : `${data?.progress ?? 0}%`}
              hint={
                data?.course
                  ? `${data.lessonsDone} of ${data.lessonsTotal} lessons`
                  : 'No course assigned yet'
              }
            />
            <KpiCard
              title="Quizzes passed"
              icon={GraduationCap}
              accent="green"
              loading={loading}
              value={data?.quizzesPassed ?? 0}
              hint={
                data?.quizzesToRetake
                  ? `${data.quizzesToRetake} to retake`
                  : 'Keep it up!'
              }
            />
            <KpiCard
              title="Certificates"
              icon={BadgeCheck}
              accent="blue"
              loading={loading}
              value={data?.certificates ?? 'Unavailable'}
              hint="Exams passed"
            />
            <KpiCard
              title="Badges"
              icon={Award}
              accent="amber"
              loading={loading}
              value={data?.badges ?? 'Unavailable'}
              hint="Earned in live classes"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard
              title="Continue learning"
              subtitle={data?.course?.title}
              className="lg:col-span-2"
              size="list"
              loading={loading}
            >
              {!currentCourse ? (
                <EmptyState
                  size="sm"
                  tone="brand"
                  className="flex-1"
                  icon={BookOpen}
                  title="No course yet"
                  description="Your tutor will assign your first course soon."
                  action={
                    <NavButton
                      label="See my schedule"
                      view="schedule"
                      onNavigate={onNavigate}
                    />
                  }
                />
              ) : nextLesson ? (
                <div className="flex flex-1 flex-col justify-center gap-5">
                  <ProgressBar value={data?.progress ?? null} />
                  <div className="flex flex-col gap-4 rounded-2xl bg-purple-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:bg-purple-500/10">
                    <div className="min-w-0">
                      <p className="text-xs font-bold tracking-wider text-purple-700 uppercase dark:text-purple-300">
                        Up next
                      </p>
                      <p className="mt-1 truncate text-lg font-black text-slate-900 dark:text-white">
                        {nextLesson.title}
                      </p>
                    </div>
                    {onNavigate && (
                      <Button
                        onClick={() =>
                          onNavigate('courses', {
                            course: currentCourse.id,
                            lesson: nextLesson.id,
                          })
                        }
                      >
                        <PlayCircle size={16} aria-hidden="true" /> Continue
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState
                  size="sm"
                  tone="brand"
                  className="flex-1"
                  icon={CheckCircle2}
                  title={
                    data?.lessonsTotal
                      ? 'Course complete'
                      : 'No lessons published yet'
                  }
                  description={
                    data?.lessonsTotal
                      ? 'You have finished every lesson. Great work!'
                      : undefined
                  }
                  action={
                    <NavButton
                      label="Review my course"
                      view="courses"
                      onNavigate={onNavigate}
                    />
                  }
                />
              )}
            </ChartCard>

            {classesUnavailable ? (
              <InsightsError
                title="Upcoming classes could not be loaded"
                onRetry={retryClasses}
              />
            ) : (
              <NextClassCard
                classes={classes}
                loading={classesLoading}
                onNavigate={onNavigate}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {!classesUnavailable && (
              <div className="lg:col-span-2">
                {classStatus}
                <ClassCalendarCard classes={classes} loading={classesLoading} />
              </div>
            )}

            <ChartCard
              title="Homework due"
              subtitle="Oldest first"
              size="list"
              loading={loading}
            >
              {data && data.homework.length > 0 ? (
                <ul className="space-y-3">
                  {data.homework.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/10"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {item.task}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Set {formatRelative(item.createdAt).toLowerCase()}
                        </p>
                      </div>
                      {item.status === 'needs_revision' && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          Revise
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  size="sm"
                  className="flex-1"
                  icon={ClipboardList}
                  title="All caught up"
                  description="New homework from your tutor will appear here."
                  action={
                    <NavButton
                      label="Open my courses"
                      view="courses"
                      onNavigate={onNavigate}
                    />
                  }
                />
              )}
            </ChartCard>
          </div>

          {data && data.courses.length > 1 && (
            <ChartCard
              title="My courses"
              subtitle="Progress in each course"
              size="auto"
            >
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {data.courses.map((course) => (
                  <li
                    key={course.id}
                    className="grid grid-cols-1 items-center gap-2 py-3 sm:grid-cols-[1fr_minmax(10rem,16rem)_auto] sm:gap-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {course.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {course.lessonsDone} of {course.lessonsTotal} lessons
                      </p>
                    </div>
                    <ProgressBar value={course.progress} />
                    <span
                      className={`justify-self-start rounded-full px-2.5 py-0.5 text-xs font-bold sm:justify-self-end ${
                        course.progress === 100
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                      }`}
                    >
                      {course.progress === 100 ? 'Completed' : 'In progress'}
                    </span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          )}
        </>
      )}
      {query.isError &&
        !data &&
        (classesUnavailable ? (
          <InsightsError
            title="Upcoming classes could not be loaded"
            onRetry={retryClasses}
          />
        ) : (
          <>
            {classStatus}
            <NextClassCard
              classes={classes}
              loading={classesLoading}
              onNavigate={onNavigate}
            />
            <ClassCalendarCard classes={classes} loading={classesLoading} />
          </>
        ))}
    </section>
  )
}
