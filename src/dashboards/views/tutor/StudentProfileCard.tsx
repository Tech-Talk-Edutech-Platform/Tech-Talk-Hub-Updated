import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  ClipboardList,
  Clock,
  GraduationCap,
  Mail,
  UserRound,
} from 'lucide-react'

import { supabase } from '../../../supabase'
import { Avatar } from '../../../components/ui/Avatar'

export type StudentProfile = {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  timeZone: string | null
  parentId: string | null
  joinedAt: string | null
  plan: string | null
  classesPerWeek: number | null
  classesRemaining: number | null
  isActive: boolean | null
}

export type CourseProgress = {
  title: string
  lessonsDone: number
  lessonsTotal: number
  quizzesPassed: number
  quizzesTotal: number
}

type StudentProfileCardProps = {
  tutorId: string
  student: StudentProfile
  /** Progress in the course picked below; null when none is assigned. */
  progress: CourseProgress | null
  onOpenHomework: () => void
}

type HomeworkCounts = {
  toReview: number
  waiting: number
  revising: number
  done: number
}

const joined = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  year: 'numeric',
})

/** "3:42 PM their time", or null when the zone isn't a real one. */
function theirTime(zone: string | null) {
  if (!zone) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: zone,
    }).format(new Date())
  } catch {
    return null
  }
}

async function loadParent(parentId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', parentId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function loadHomework(tutorId: string, studentId: string) {
  const { data, error } = await supabase
    .from('student_assignments')
    .select('status')
    .eq('student_id', studentId)
    .eq('tutor_id', tutorId)
  if (error) throw error
  const counts: HomeworkCounts = {
    toReview: 0,
    waiting: 0,
    revising: 0,
    done: 0,
  }
  for (const { status } of data) {
    if (status === 'submitted') counts.toReview += 1
    else if (status === 'needs_revision') counts.revising += 1
    else if (status === 'completed') counts.done += 1
    else counts.waiting += 1
  }
  return counts
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-purple-500" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
          {label}
        </dt>
        <dd className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
          {children}
        </dd>
      </div>
    </div>
  )
}

/** The selected student at a glance: who they are, family, plan, progress, homework. */
export function StudentProfileCard({
  tutorId,
  student,
  progress,
  onOpenHomework,
}: StudentProfileCardProps) {
  const parent = useQuery({
    queryKey: ['tutor', 'student-parent', student.parentId],
    queryFn: () => loadParent(student.parentId ?? ''),
    enabled: Boolean(student.parentId),
    staleTime: 5 * 60_000,
  })
  const homework = useQuery({
    queryKey: ['tutor', 'student-homework', tutorId, student.id],
    queryFn: () => loadHomework(tutorId, student.id),
  })

  const localTime = theirTime(student.timeZone)
  const percent =
    progress && progress.lessonsTotal > 0
      ? Math.round((progress.lessonsDone / progress.lessonsTotal) * 100)
      : 0

  return (
    <section
      aria-label={`${student.name}'s profile`}
      className="space-y-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex flex-wrap items-center gap-4">
        <Avatar
          name={student.name}
          src={student.avatarUrl}
          userRole="student"
          size={56}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-black text-gray-900 dark:text-white">
              {student.name}
            </h2>
            {student.isActive === false && (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 uppercase dark:bg-white/10 dark:text-gray-300">
                Inactive
              </span>
            )}
            {student.plan && (
              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 uppercase dark:bg-purple-500/15 dark:text-purple-300">
                {student.plan}
              </span>
            )}
          </div>
          {student.email && (
            <p className="flex items-center gap-1.5 truncate text-xs text-gray-500">
              <Mail size={12} aria-hidden="true" /> {student.email}
            </p>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Fact icon={<UserRound size={16} />} label="Parent">
          {!student.parentId
            ? 'No parent linked'
            : parent.data
              ? parent.data.full_name || parent.data.email
              : parent.isPending
                ? 'Loading…'
                : 'Not available'}
          {parent.data?.email && parent.data.full_name && (
            <a
              href={`mailto:${parent.data.email}`}
              className="block truncate text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              {parent.data.email}
            </a>
          )}
        </Fact>
        <Fact icon={<Clock size={16} />} label="Time zone">
          {student.timeZone ? (
            <>
              {student.timeZone.replace(/_/g, ' ')}
              {localTime && (
                <span className="block text-xs font-medium text-gray-500">
                  {localTime} their time
                </span>
              )}
            </>
          ) : (
            'Not set'
          )}
        </Fact>
        <Fact icon={<CalendarDays size={16} />} label="Classes">
          {student.classesPerWeek
            ? `${student.classesPerWeek} a week`
            : 'Not set'}
          {student.classesRemaining !== null && (
            <span className="block text-xs font-medium text-gray-500">
              {student.classesRemaining} left on their plan
            </span>
          )}
        </Fact>
        <Fact icon={<GraduationCap size={16} />} label="Student since">
          {student.joinedAt
            ? joined.format(new Date(student.joinedAt))
            : 'Unknown'}
        </Fact>
      </dl>

      <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-2 dark:border-white/10">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            Course progress
          </p>
          {progress ? (
            <>
              <p className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                {progress.title}
              </p>
              <progress
                aria-label={`${progress.title} progress`}
                max={100}
                value={percent}
                className="mt-2 block h-2 w-full appearance-none overflow-hidden rounded-full bg-gray-100 dark:bg-white/10 [&::-moz-progress-bar]:bg-purple-600 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-purple-600"
              />
              <p className="mt-1.5 text-xs text-gray-500 tabular-nums">
                {progress.lessonsDone} of {progress.lessonsTotal} lessons done
                {progress.quizzesTotal > 0 &&
                  ` · ${progress.quizzesPassed} of ${progress.quizzesTotal} quizzes passed`}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              No course assigned yet.
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              Homework you set
            </p>
            <button
              type="button"
              onClick={onOpenHomework}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-purple-600 hover:underline dark:text-purple-400"
            >
              <ClipboardList size={13} aria-hidden="true" /> Course Assignment
            </button>
          </div>
          {homework.isError ? (
            <p className="mt-1 text-sm text-gray-500">
              Couldn’t load homework.
            </p>
          ) : homework.data ? (
            <ul className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {(
                [
                  ['To review', homework.data.toReview, 'text-amber-600'],
                  ['Not handed in', homework.data.waiting, 'text-gray-600'],
                  ['Being redone', homework.data.revising, 'text-pink-600'],
                  ['Reviewed', homework.data.done, 'text-emerald-600'],
                ] as const
              ).map(([label, count, tone]) => (
                <li
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 dark:bg-white/5"
                >
                  <span className="text-gray-500 dark:text-gray-400">
                    {label}
                  </span>
                  <span
                    className={`font-black tabular-nums ${tone} dark:brightness-125`}
                  >
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Loading…</p>
          )}
        </div>
      </div>
    </section>
  )
}
