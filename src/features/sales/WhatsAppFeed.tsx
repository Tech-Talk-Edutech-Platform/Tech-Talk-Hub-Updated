import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCheck,
  Clock3,
  MessageCircle,
  PlugZap,
  Send,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { useNow } from '../../hooks/useNow'
import { problemText, useSalesData } from './salesDataContext'
import type { WhatsAppMessage, WhatsAppStatus, WhatsAppTemplate } from './types'
import { EmptyState, Panel } from './ui'
import {
  JOIN_LINK_TO_FOLLOW,
  openTrialWhatsApp,
  whatsappLink,
} from './whatsapp'

const TEMPLATE_LABEL: Record<WhatsAppTemplate, string> = {
  trial_confirmation: 'Booking confirmation',
  trial_reminder: 'Reminder · 2 h before',
  trial_follow_up: 'After-trial follow-up',
}

const STATUS_TICK: Record<
  WhatsAppStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  queued: { label: 'Scheduled', icon: Clock3, className: 'text-slate-500' },
  sent: { label: 'Sent', icon: Check, className: 'text-slate-500' },
  delivered: {
    label: 'Delivered',
    icon: CheckCheck,
    className: 'text-slate-500',
  },
  read: {
    label: 'Read',
    icon: CheckCheck,
    className: 'text-sky-600 dark:text-sky-400',
  },
  failed: {
    label: 'Not delivered',
    icon: AlertTriangle,
    className: 'font-bold text-rose-600',
  },
  cancelled: {
    label: 'Not sent · booking removed',
    icon: Ban,
    className: 'text-slate-400',
  },
}

function StatusTick({ status }: { status: WhatsAppStatus }) {
  const { label, icon: Icon, className } = STATUS_TICK[status]
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon size={13} aria-hidden /> {label}
    </span>
  )
}

const when = (iso: string) =>
  new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

/**
 * Automatic WhatsApp messages to parents and their replies. `repId` limits it
 * to one rep's bookings; null shows everything.
 */
export function WhatsAppFeed({ repId }: { repId: string | null }) {
  const data = useSalesData()
  const now = useNow(60_000)
  const [showReplies, setShowReplies] = useState(false)

  const messages = useMemo(() => {
    const bookingIds =
      repId === null
        ? null
        : new Set(
            // Removed bookings too, so their stopped messages still show.
            [...data.bookings, ...data.removedBookings]
              .filter((booking) => booking.salesRepId === repId)
              .map((booking) => booking.id),
          )
    return data.messages.filter(
      (message) =>
        (bookingIds === null ||
          (message.bookingId !== null && bookingIds.has(message.bookingId))) &&
        (!showReplies || message.direction === 'inbound'),
    )
  }, [data.messages, data.bookings, data.removedBookings, repId, showReplies])

  const stats = useMemo(() => {
    const weekAgo = now - 7 * 86_400_000
    const recent = messages.filter((message) => {
      const at = new Date(message.at).getTime()
      return at >= weekAgo && at <= now && message.direction === 'outbound'
    })
    const count = (status: WhatsAppStatus) =>
      recent.filter((message) => message.status === status).length
    return {
      sent: recent.length,
      read: count('read'),
      failed: count('failed'),
      scheduled: messages.filter((message) => message.status === 'queued')
        .length,
    }
  }, [messages, now])

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Panel
        title="WhatsApp messages"
        icon={MessageCircle}
        action={
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showReplies}
              onChange={(event) => setShowReplies(event.target.checked)}
              className="size-4 accent-purple-600"
            />
            Parent replies only
          </label>
        }
      >
        {messages.length === 0 ? (
          <EmptyState>No messages yet.</EmptyState>
        ) : (
          <ul className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
            {messages.slice(0, 80).map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
          </ul>
        )}
      </Panel>

      <div className="space-y-4">
        <Panel title="Last 7 days" icon={CheckCheck}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Sent" value={stats.sent} />
            <Stat
              label="Read"
              value={
                stats.sent
                  ? `${Math.round((stats.read / stats.sent) * 100)}%`
                  : '—'
              }
            />
            <Stat label="Not delivered" value={stats.failed} />
            <Stat label="Scheduled" value={stats.scheduled} />
          </dl>
        </Panel>
        <Panel title="Connections" icon={PlugZap}>
          <ul className="space-y-3 text-sm">
            <li>
              <p className="flex items-center justify-between gap-2 font-bold text-slate-900 dark:text-white">
                WhatsApp Business API
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  Not connected
                </span>
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Once connected, confirmations, reminders and follow-ups send
                automatically, and parents’ replies land here. Until then, tap
                “Open in WhatsApp” on a scheduled message, then mark it sent
                once you’ve sent it.
              </p>
            </li>
            <li>
              <p className="flex items-center justify-between gap-2 font-bold text-slate-900 dark:text-white">
                Privyr
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  Not connected
                </span>
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Planned: every booking is saved here first and copied to Privyr,
                so the team keeps its workflow and the data stays ours.
              </p>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-black text-slate-900 tabular-nums dark:text-white">
        {value}
      </dd>
    </div>
  )
}

/**
 * Opens a scheduled message and lets the rep confirm after sending it.
 */
function SendByHand({ message }: { message: WhatsAppMessage }) {
  const data = useSalesData()
  const [marking, setMarking] = useState(false)
  const [opened, setOpened] = useState(false)
  const booking = data.bookings.find(({ id }) => id === message.bookingId)
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={whatsappLink(message.phone, message.body)}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          if (
            !data.isDemo &&
            booking?.classroomCode &&
            message.body.includes(JOIN_LINK_TO_FOLLOW)
          ) {
            event.preventDefault()
            void openTrialWhatsApp(booking.id, message.phone, message.body)
              .then(() => setOpened(true))
              .catch((error: unknown) =>
                toast.error(problemText(error, 'Couldn’t open WhatsApp.')),
              )
          } else {
            setOpened(true)
          }
        }}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 font-extrabold text-white hover:bg-emerald-700"
      >
        <Send size={12} aria-hidden /> Open in WhatsApp
      </a>
      {opened && (
        <button
          type="button"
          disabled={marking}
          className="px-2 py-1 font-bold underline"
          onClick={() => {
            setMarking(true)
            void data
              .markMessageSent(message.id)
              .catch((error: unknown) =>
                toast.error(problemText(error, 'Couldn’t mark it sent.')),
              )
              .finally(() => setMarking(false))
          }}
        >
          Mark sent
        </button>
      )}
    </div>
  )
}

function MessageRow({ message }: { message: WhatsAppMessage }) {
  const inbound = message.direction === 'inbound'
  return (
    <li className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
          inbound
            ? 'rounded-tl-sm bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-white/10'
            : 'rounded-tr-sm bg-[#e7ffdb] dark:bg-emerald-950/60'
        }`}
      >
        <p className="mb-1 flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <span className="text-slate-900 dark:text-white">
            {inbound ? message.contactName : `To ${message.contactName}`}
          </span>
          {message.template && <span>{TEMPLATE_LABEL[message.template]}</span>}
        </p>
        <p className="leading-6 whitespace-pre-line text-slate-800 dark:text-slate-100">
          {message.body}
        </p>
        <p className="mt-1.5 flex items-center justify-end gap-3 text-[11px] text-slate-500">
          {inbound && (
            <a
              href={whatsappLink(message.phone, '')}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              Reply in WhatsApp
            </a>
          )}
          {!inbound && message.status === 'queued' && message.body && (
            <SendByHand message={message} />
          )}
          <span>{when(message.at)}</span>
          {!inbound && <StatusTick status={message.status} />}
        </p>
      </div>
    </li>
  )
}
