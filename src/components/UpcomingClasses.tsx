import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
} from 'lucide-react'

interface UpcomingClass {
  id: string
  start_time: string
  title?: string | null
  student_name?: string | null
  grade?: string | null
  meet_link?: string | null
}

interface UpcomingClassesProps {
  classes?: UpcomingClass[]
  loading: boolean
}

const NO_CLASSES: UpcomingClass[] = []
/** Shows this many classes per page, so a busy tutor's list stays short. */
const PAGE_SIZE = 5

const dayAndTime = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** The student's name, unless the class title already says it. */
function studentLine(item: UpcomingClass) {
  const name = item.student_name?.trim()
  if (!name || name === 'N/A') return null
  return item.title?.toLowerCase().includes(name.toLowerCase()) ? null : name
}

/**
 * Dashboard › Upcoming classes: each class with its details (when, who, how
 * to join) in one row, so nothing needs opening or repeating elsewhere.
 */
export default function UpcomingClasses({
  classes = NO_CLASSES,
  loading,
}: UpcomingClassesProps) {
  const [page, setPage] = useState(0)

  const pageCount = Math.max(1, Math.ceil(classes.length / PAGE_SIZE))
  // The list can shrink after a reload; never point past the last page.
  const currentPage = Math.min(page, pageCount - 1)
  const pageClasses = classes.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  )

  if (loading)
    return (
      <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
    )

  return (
    <section aria-labelledby="upcoming-classes-heading">
      <h3
        id="upcoming-classes-heading"
        className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"
      >
        <CalendarClock
          size={18}
          className="text-purple-600"
          aria-hidden="true"
        />
        Upcoming classes
      </h3>

      {classes.length > 0 ? (
        <ul className="space-y-3">
          {pageClasses.map((item) => {
            const student = studentLine(item)
            const classroom = item.meet_link?.startsWith('/classroom/')
            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {item.title || 'Class'}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <CalendarClock size={12} aria-hidden="true" />
                      {dayAndTime.format(new Date(item.start_time))}
                    </span>
                    {student && (
                      <span className="inline-flex items-center gap-1">
                        <User size={12} aria-hidden="true" />
                        {student}
                      </span>
                    )}
                    {item.grade && <span>Grade {item.grade}</span>}
                  </p>
                </div>
                {item.meet_link ? (
                  <a
                    href={item.meet_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-700"
                  >
                    {classroom ? 'Open classroom' : 'Join meeting'}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">
                    Link not set yet
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-xs font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">
          No upcoming classes.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
        {pageCount > 1 ? (
          <nav
            aria-label="Upcoming classes pages"
            className="flex items-center gap-3"
          >
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10"
            >
              <ChevronLeft size={12} aria-hidden="true" /> Prev
            </button>
            <span aria-live="polite" className="tabular-nums">
              Page {currentPage + 1} of {pageCount} · {classes.length} classes
            </span>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10"
            >
              Next <ChevronRight size={12} aria-hidden="true" />
            </button>
          </nav>
        ) : (
          <span />
        )}
        <Link
          to="/calendar"
          className="inline-flex items-center gap-1 text-purple-600 hover:underline dark:text-purple-300"
        >
          Full schedule <ChevronRight size={12} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
