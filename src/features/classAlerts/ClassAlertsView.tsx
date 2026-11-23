import { useState } from 'react'
import {
  BellRing,
  CheckCircle2,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'

import { useNow } from '../../hooks/useNow'
import type { ClassAlertType } from '../../types/classroomTables'
import type { AppRole } from '../../types/roles'
import { whatsappLink } from '../sales/whatsapp'
import {
  ALERT_TYPE_LABEL,
  AlertsNotSetUpError,
  alertTypesFor,
  useClassAlerts,
  useResolveAlert,
  type ClassAlert,
} from './api'

const INTRO: Record<'sales' | 'tech' | 'admin', string> = {
  sales:
    'Tutors send an AC alert when a family needs following up. Call or message them, then mark the alert handled.',
  tech: 'Tutors send a support alert when something technical goes wrong in class. Check in with the tutor, then mark it handled.',
  admin:
    'Everything tutors raise from their classes: AC alerts (shared with sales), support alerts (shared with tech admins) and Need help messages.',
}

const TYPE_TONE: Record<ClassAlertType, string> = {
  ac: 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300',
  support:
    'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
  help: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function ago(iso: string, now: number): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'just now'
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour')
  return relative.format(Math.round(seconds / 86_400), 'day')
}

const fullTime = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

const classKind = (type: string | null) =>
  type === 'trial' ? 'Trial' : type ? 'Class' : null

type Tab = 'open' | 'handled'

/**
 * The Class alerts inbox: what tutors flag from the classroom, for the people
 * it's routed to. Sales see AC alerts, tech admins support alerts, admins
 * everything.
 */
export function ClassAlertsView({ role }: { role: AppRole }) {
  const types = alertTypesFor(role)
  const audience =
    role === 'marketer' ? 'sales' : role === 'tech_admin' ? 'tech' : 'admin'
  const [tab, setTab] = useState<Tab>('open')
  const [filter, setFilter] = useState<ClassAlertType | 'all'>('all')
  const alerts = useClassAlerts(tab === 'handled')
  const open = useClassAlerts(false)
  const now = useNow(30_000)

  const rows = (alerts.data ?? []).filter(
    (alert) =>
      (tab === 'open' ? !alert.resolved_at : !!alert.resolved_at) &&
      (filter === 'all' || alert.alert_type === filter),
  )
  const openCount = open.data?.length ?? 0

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            <BellRing className="text-pink-600" aria-hidden /> Class alerts
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            {INTRO[audience]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void alerts.refetch()}
          disabled={alerts.isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <RefreshCw
            size={15}
            className={alerts.isFetching ? 'animate-spin' : ''}
            aria-hidden
          />
          Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Alert status"
          className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900"
        >
          {(
            [
              ['open', `Open${openCount ? ` (${openCount})` : ''}`],
              ['handled', 'Handled'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                tab === id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {types.length > 1 && (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Show
            <select
              value={filter}
              onChange={(event) => {
                const value = event.target.value
                setFilter(types.find((type) => type === value) ?? 'all')
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">All alerts</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {ALERT_TYPE_LABEL[type]}s
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {alerts.isPending ? (
        <p className="py-16 text-center text-sm font-semibold text-slate-500">
          Loading alerts…
        </p>
      ) : alerts.isError ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {alerts.error instanceof AlertsNotSetUpError
            ? alerts.error.message
            : `Couldn’t load the alerts. ${alerts.error.message}`}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-white/10">
          <CheckCircle2
            className="mx-auto text-emerald-500"
            size={28}
            aria-hidden
          />
          <p className="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
            {tab === 'open'
              ? 'Nothing waiting on you'
              : 'No handled alerts yet'}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {tab === 'open'
              ? 'New alerts from classes show up here within seconds.'
              : 'Alerts you mark handled move here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              now={now}
              canOpenRoom={audience !== 'sales'}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function AlertCard({
  alert,
  now,
  canOpenRoom,
}: {
  alert: ClassAlert
  now: number
  canOpenRoom: boolean
}) {
  const resolve = useResolveAlert()
  const handled = !!alert.resolved_at
  const kind = classKind(alert.class_type)
  const family = alert.parent_name || alert.parent_phone || alert.parent_email
  const meta = [
    kind,
    alert.tutor_name && `Tutor ${alert.tutor_name}`,
    alert.students && `Students: ${alert.students}`,
  ].filter(Boolean)

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${TYPE_TONE[alert.alert_type]}`}
          >
            {ALERT_TYPE_LABEL[alert.alert_type]}
            {alert.topic ? ` · ${alert.topic}` : ''}
          </span>
          <h2 className="mt-2 text-base font-extrabold text-slate-950 dark:text-white">
            {alert.session_title}
          </h2>
          {meta.length > 0 && (
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {meta.join(' · ')}
            </p>
          )}
        </div>
        <time
          dateTime={alert.created_at}
          title={fullTime(alert.created_at)}
          className="shrink-0 text-sm font-semibold text-slate-500 tabular-nums dark:text-slate-400"
        >
          {ago(alert.created_at, now)}
        </time>
      </div>

      {alert.message && (
        <blockquote className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-[15px] leading-6 whitespace-pre-line text-slate-800 dark:bg-white/5 dark:text-slate-100">
          {alert.message}
          {alert.sender_name && (
            <footer className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {alert.sender_name}
            </footer>
          )}
        </blockquote>
      )}

      {(family || alert.tutor_email) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {family && (
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Family: {alert.parent_name ?? 'Parent'}
            </span>
          )}
          {alert.parent_phone && (
            <>
              <ContactLink
                href={`tel:${alert.parent_phone.replace(/[^\d+]/g, '')}`}
                icon={Phone}
                label={alert.parent_phone}
              />
              <ContactLink
                href={whatsappLink(
                  alert.parent_phone,
                  `Hi ${alert.parent_name?.split(/\s+/)[0] ?? 'there'}, this is Tech Talk Hub about ${alert.students ?? 'your child'}’s class.`,
                )}
                icon={MessageCircle}
                label="WhatsApp"
                external
              />
            </>
          )}
          {alert.parent_email && (
            <ContactLink
              href={`mailto:${alert.parent_email}`}
              icon={Mail}
              label={alert.parent_email}
            />
          )}
          {alert.tutor_email && (
            <ContactLink
              href={`mailto:${alert.tutor_email}?subject=${encodeURIComponent(`About ${alert.session_title}`)}`}
              icon={Mail}
              label="Email the tutor"
            />
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {handled && alert.resolved_at
            ? `Handled ${ago(alert.resolved_at, now)}${alert.resolved_by_name ? ` by ${alert.resolved_by_name}` : ''}`
            : alert.scheduled_at
              ? `Class time ${fullTime(alert.scheduled_at)}`
              : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {canOpenRoom && (
            <a
              href={`/classroom/${encodeURIComponent(alert.room_code)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              Open classroom <ExternalLink size={14} aria-hidden />
            </a>
          )}
          <button
            type="button"
            disabled={resolve.isPending}
            onClick={() => resolve.mutate({ id: alert.id, resolved: !handled })}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold transition disabled:opacity-50 ${
              handled
                ? 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {handled ? (
              <>
                <RotateCcw size={14} aria-hidden /> Reopen
              </>
            ) : (
              <>
                <CheckCircle2 size={14} aria-hidden />
                {resolve.isPending ? 'Saving…' : 'Mark handled'}
              </>
            )}
          </button>
        </div>
      </div>
      {resolve.isError && (
        <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">
          {resolve.error.message}
        </p>
      )}
    </li>
  )
}

function ContactLink({
  href,
  icon: Icon,
  label,
  external = false,
}: {
  href: string
  icon: typeof Phone
  label: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
    >
      <Icon size={13} aria-hidden /> {label}
    </a>
  )
}
