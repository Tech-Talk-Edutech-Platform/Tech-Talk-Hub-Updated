import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CalendarDays, Video } from 'lucide-react'

import { ChartCard } from '../../components/dashboard/ui/ChartCard'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { dateKey } from '../../components/dashboard/dateKey'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { useNow } from '../../hooks/useNow'
import { joinableNow, type StudentClass } from './studentInsightsData'

const dayAndTime = new Intl.DateTimeFormat('en-KE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})
const timeOnly = new Intl.DateTimeFormat('en-KE', {
  hour: 'numeric',
  minute: '2-digit',
})
const selectedDay = new Intl.DateTimeFormat('en-KE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function startsIn(at: string, now: number) {
  const minutes = Math.round((Date.parse(at) - now) / 60_000)
  if (minutes <= 0) return 'Starting now'
  if (minutes < 60) return `In ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `In ${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Tomorrow' : `In ${days} days`
}

function hasEnded(item: StudentClass, now: number) {
  const end = item.endsAt
    ? Date.parse(item.endsAt)
    : Date.parse(item.startsAt) + 90 * 60_000
  return end < now
}

const joinClass =
  'inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none'

/** Join control when the class is open; nothing otherwise. */
function JoinButton({ item, now }: { item: StudentClass; now: number }) {
  if (!joinableNow(item, now)) return null
  const label = (
    <>
      <Video size={14} aria-hidden="true" /> Join
    </>
  )
  if (item.joinPath) {
    return (
      <Link
        to={item.joinPath}
        className={joinClass}
        aria-label={`Join ${item.title}`}
      >
        {label}
      </Link>
    )
  }
  return item.meetLink ? (
    <a
      href={item.meetLink}
      target="_blank"
      rel="noopener noreferrer"
      className={joinClass}
      aria-label={`Join ${item.title} (opens in a new tab)`}
    >
      {label}
    </a>
  ) : null
}

/** The next class with a countdown and a Join button once it opens. */
export function NextClassCard({
  classes,
  loading,
  onNavigate,
}: {
  classes: readonly StudentClass[]
  loading: boolean
  onNavigate?: (view: string) => void
}) {
  const now = useNow(30_000)
  const next = classes.find((item) => !hasEnded(item, now))

  return (
    <ChartCard title="Next class" size="list" loading={loading}>
      {next ? (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                next.live
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                  : 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300'
              }`}
            >
              {next.live ? 'Live now' : startsIn(next.startsAt, now)}
            </span>
            <p className="mt-3 text-lg leading-snug font-black text-slate-900 dark:text-white">
              {next.title}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <CalendarClock size={14} aria-hidden="true" />
              {dayAndTime.format(new Date(next.startsAt))}
            </p>
            {next.tutorName && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                with {next.tutorName}
              </p>
            )}
          </div>
          <div>
            {joinableNow(next, now) ? (
              <JoinButton item={next} now={now} />
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {next.joinPath || next.meetLink
                  ? 'The Join button appears when the class opens.'
                  : 'The meeting link is pending.'}
              </p>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          size="sm"
          className="flex-1"
          icon={CalendarClock}
          title="No upcoming classes"
          description="Your next booked class will show here."
          action={
            onNavigate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigate('schedule')}
              >
                Open my schedule
              </Button>
            )
          }
        />
      )}
    </ChartCard>
  )
}

/**
 * Month calendar of classes (the FullCalendar setup the schedule pages use)
 * with the chosen day's classes beside it.
 */
export function ClassCalendarCard({
  classes,
  loading,
  className = '',
}: {
  classes: readonly StudentClass[]
  loading: boolean
  className?: string
}) {
  const now = useNow(30_000)
  const [selected, setSelected] = useState(() => dateKey(new Date()))
  const dateInputId = useId()
  const byDay = new Map<string, StudentClass[]>()
  for (const item of classes) {
    const key = dateKey(new Date(item.startsAt))
    byDay.set(key, [...(byDay.get(key) ?? []), item])
  }
  const dayClasses = byDay.get(selected) ?? []
  const [year, month, day] = selected.split('-').map(Number)
  // One shaded background block per class day, so cells stay readable at
  // card size instead of squeezing event titles into them.
  const classDays = [...byDay.keys()].map((key) => ({
    id: key,
    start: key,
    allDay: true,
    display: 'background',
  }))

  return (
    <ChartCard
      title="My classes"
      subtitle="Days with a class are shaded; pick one to see it"
      loading={loading}
      className={className}
    >
      <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
        <div className="tth-class-calendar min-w-0 text-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label htmlFor={dateInputId} className="font-semibold">
              Choose a class date
            </label>
            <input
              id={dateInputId}
              type="date"
              value={selected}
              onChange={(event) => {
                if (event.target.value) setSelected(event.target.value)
              }}
              className="max-w-full rounded-lg border border-slate-300 px-2 py-1 dark:border-white/20 dark:bg-slate-900"
            />
          </div>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
            height="auto"
            fixedWeekCount={false}
            dayHeaderFormat={{ weekday: 'narrow' }}
            events={classDays}
            dateClick={(info) => setSelected(dateKey(info.date))}
            dayCellClassNames={(cell) =>
              dateKey(cell.date) === selected ? ['tth-selected-day'] : []
            }
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <p
            className="mb-3 text-sm font-bold text-slate-900 dark:text-white"
            aria-live="polite"
          >
            {selectedDay.format(new Date(year, month - 1, day))}
          </p>
          {dayClasses.length > 0 ? (
            <ul className="space-y-2">
              {dayClasses.map((item) => {
                const ended = hasEnded(item, now)
                return (
                  <li
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/10 ${
                      ended ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {timeOnly.format(new Date(item.startsAt))}
                        {item.tutorName ? ` · ${item.tutorName}` : ''}
                        {ended ? ' · Done' : ''}
                      </p>
                    </div>
                    <JoinButton item={item} now={now} />
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              size="sm"
              className="flex-1"
              icon={CalendarDays}
              title="No classes this day"
              description="Pick a shaded day to see its classes."
            />
          )}
        </div>
      </div>
    </ChartCard>
  )
}
