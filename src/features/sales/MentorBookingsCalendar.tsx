import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import type { EventClickArg } from '@fullcalendar/core'
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  UserRound,
  Video,
} from 'lucide-react'

import { Modal } from '../../components/ui/Modal'
import { useNow } from '../../hooks/useNow'
import { EmptyState, Panel } from './ui'

/** One trial on a mentor's calendar, from demo data or `calendar_events`. */
export type MentorCalendarItem = {
  id: string
  title: string
  start: string
  end: string
  meetLink: string | null
  studentName: string
  parentName?: string | null
  detail?: string | null
  notes?: string | null
  /** Shown as a small label, e.g. "Scheduled" or "Completed". */
  statusLabel?: string | null
  cancelled?: boolean
}

const JOIN_WINDOW_MS = 15 * 60_000

const fullTime = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

/**
 * A mentor's trial bookings: a week calendar plus the next trials with their
 * meeting links, so joining on time is one click.
 */
export function MentorBookingsCalendar({
  items,
  emptyMessage = 'No trials are booked with you yet.',
}: {
  items: readonly MentorCalendarItem[]
  emptyMessage?: string
}) {
  const now = useNow(60_000)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find((item) => item.id === selectedId) ?? null

  const events = useMemo(
    () =>
      items.map((item) => {
        const past = new Date(item.end).getTime() < now
        const color = item.cancelled ? '#94a3b8' : past ? '#64748b' : '#db2777'
        return {
          id: item.id,
          title: item.title,
          start: item.start,
          end: item.end,
          backgroundColor: color,
          borderColor: color,
        }
      }),
    [items, now],
  )

  const upcoming = useMemo(
    () =>
      items
        .filter(
          (item) => !item.cancelled && new Date(item.end).getTime() >= now,
        )
        .toSorted(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        )
        .slice(0, 8),
    [items, now],
  )

  const onEventClick = (info: EventClickArg) => setSelectedId(info.event.id)

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Trial calendar" icon={CalendarDays}>
        <div className="global-schedule-calendar min-h-[560px] text-sm">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            height="auto"
            nowIndicator
            events={events}
            eventClick={onEventClick}
            slotMinTime="07:00:00"
            slotMaxTime="21:00:00"
            allDaySlot={false}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: 'short',
            }}
          />
        </div>
      </Panel>

      <Panel title="Next trials" icon={Clock3}>
        {upcoming.length === 0 ? (
          <EmptyState>{emptyMessage}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((item) => {
              const startsIn = new Date(item.start).getTime() - now
              const joinable = startsIn <= JOIN_WINDOW_MS
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-3 dark:border-white/10"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="block w-full text-left"
                  >
                    <span className="block text-sm font-extrabold text-slate-900 dark:text-white">
                      {item.studentName}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {fullTime(item.start)}
                      {item.detail ? ` · ${item.detail}` : ''}
                    </span>
                  </button>
                  {item.meetLink ? (
                    <a
                      href={item.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold ${
                        joinable
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200'
                      }`}
                    >
                      <Video size={13} aria-hidden />
                      {joinable ? 'Join now' : 'Meeting link'}
                    </a>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-amber-600">
                      No meeting link yet. Ask an admin to add one.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {selected && (
        <Modal
          title={selected.title}
          closeLabel="Close trial details"
          onClose={() => setSelectedId(null)}
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">When</dt>
            <dd className="font-bold">{fullTime(selected.start)}</dd>
            <dt className="text-slate-500">Student</dt>
            <dd className="font-bold">
              {selected.studentName}
              {selected.detail ? ` · ${selected.detail}` : ''}
            </dd>
            {selected.parentName && (
              <>
                <dt className="text-slate-500">Parent</dt>
                <dd className="flex items-center gap-1 font-bold">
                  <UserRound size={14} aria-hidden /> {selected.parentName}
                </dd>
              </>
            )}
            {selected.statusLabel && (
              <>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-bold">{selected.statusLabel}</dd>
              </>
            )}
            {selected.notes && (
              <>
                <dt className="text-slate-500">Notes</dt>
                <dd className="text-slate-700">{selected.notes}</dd>
              </>
            )}
          </dl>
          {selected.meetLink ? (
            <a
              href={selected.meetLink}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"
            >
              <Video size={16} aria-hidden /> Join meeting{' '}
              <ExternalLink size={14} aria-hidden />
            </a>
          ) : (
            <p className="mt-5 text-sm font-semibold text-amber-700">
              No meeting link yet. Ask an admin to add one.
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
