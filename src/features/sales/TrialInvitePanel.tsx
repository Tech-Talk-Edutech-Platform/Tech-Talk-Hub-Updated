import { useContext, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MailCheck,
  MailX,
  Mail,
  MonitorPlay,
  Send,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { problemText, SalesDataContext } from './salesDataContext'
import {
  InviteRequestError,
  familyJoinUrl,
  requestTrialGuestLink,
} from './trialInvites'
import type { InviteResult, TrialInviteEmail } from './types'

/** A classroom trial, as the invite controls need it. */
export type InviteTarget = {
  roomCode: string
  bookingId: string
  parentEmail: string
  invite: TrialInviteEmail
}

type SendInvite = (resend: boolean) => Promise<InviteResult>

type Tone = 'ok' | 'warn' | 'muted' | 'busy'

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  warn: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  muted:
    'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
  busy: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
}

const sentTime = (iso: string) =>
  new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

/** Where the parent's email stands, short (lists) and in full (panels). */
function inviteState(target: InviteTarget, sending: boolean) {
  const { invite, parentEmail } = target
  const email = parentEmail.trim()
  if (sending) {
    return {
      tone: 'busy' as Tone,
      icon: Loader2,
      short: 'Emailing…',
      full: `Emailing the class link to ${email}…`,
    }
  }
  if (invite.status === 'sent') {
    const when = invite.sentAt ? ` · ${sentTime(invite.sentAt)}` : ''
    return {
      tone: 'ok' as Tone,
      icon: MailCheck,
      short: `Link emailed${when}`,
      full: `Emailed to ${email || 'the parent'}${when}`,
    }
  }
  if (!email) {
    return {
      tone: 'muted' as Tone,
      icon: MailX,
      short: 'No parent email',
      full: 'No email address for this parent. Share the link on WhatsApp instead.',
    }
  }
  if (invite.status === 'failed') {
    return {
      tone: 'warn' as Tone,
      icon: AlertTriangle,
      short: 'Email didn’t send',
      full: `The email to ${email} didn’t send${invite.error ? `: ${invite.error}` : '.'}`,
    }
  }
  return {
    tone: 'muted' as Tone,
    icon: Mail,
    short: 'Not emailed yet',
    full: `The class link hasn’t been emailed to ${email} yet.`,
  }
}

const sendLabel = (invite: TrialInviteEmail) =>
  invite.status === 'sent'
    ? 'Resend email'
    : invite.status === 'failed'
      ? 'Try again'
      : 'Email the link'

/** Sends (or resends) the invite, with toasts for what happened. */
function useInviteSender(target: InviteTarget, onSend: SendInvite) {
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try {
      const result = await onSend(target.invite.status === 'sent')
      if (result.status === 'sent') {
        toast.success(`Class link emailed to ${result.to ?? 'the parent'}.`)
      } else {
        toast.error(result.error ?? 'The email didn’t send.')
      }
    } catch (error) {
      if (error instanceof InviteRequestError && error.status === 409) {
        toast(error.message)
      } else {
        toast.error(problemText(error, 'The email couldn’t be sent.'))
      }
    } finally {
      setBusy(false)
    }
  }
  return { busy, send }
}

function useCopy(target: InviteTarget) {
  const isDemo = useContext(SalesDataContext)?.isDemo
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      const link = isDemo
        ? familyJoinUrl(target.roomCode)
        : await requestTrialGuestLink(target.bookingId)
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error(problemText(error, 'Could not copy the class link.'))
    }
  }
  return { copied, copy }
}

function StatusIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <Icon
      size={13}
      aria-hidden
      className={`shrink-0 ${tone === 'busy' ? 'animate-spin' : ''}`}
    />
  )
}

/**
 * The trial's classroom: the family's join link (no sign-in needed) and
 * whether it has been emailed to the parent, with a button to send it.
 */
export function TrialInvitePanel({
  target,
  onSend,
  sending = false,
  hostPath,
}: {
  target: InviteTarget
  onSend: SendInvite
  /** An automatic send is under way (right after booking). */
  sending?: boolean
  /** Where staff open the classroom to host it. */
  hostPath?: string
}) {
  const { busy, send } = useInviteSender(target, onSend)
  const { copied, copy } = useCopy(target)
  const state = inviteState(target, sending || busy)
  const canSend = target.parentEmail.trim() !== '' && !sending && !busy

  return (
    <section
      aria-label="Trial classroom"
      className="rounded-2xl border border-indigo-100 bg-white/80 p-4 text-left dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
          <MonitorPlay size={16} className="text-indigo-600" aria-hidden />
          Trial classroom
          <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            {target.roomCode}
          </span>
        </p>
        {hostPath && (
          <a
            href={hostPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline dark:text-indigo-300"
          >
            Open classroom <ExternalLink size={12} aria-hidden />
          </a>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        The family joins from this link. No account or sign-in needed.
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 py-1.5 pr-1.5 pl-3 ring-1 ring-slate-200 ring-inset dark:bg-slate-900/60 dark:ring-white/10">
        <Link2 size={14} className="shrink-0 text-slate-400" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-200">
          Copy an invitation for this trial
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/15"
        >
          {copied ? (
            <Check size={13} aria-hidden />
          ) : (
            <Copy size={13} aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <output
          className={`inline-flex min-w-0 items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset ${TONE_CLASS[state.tone]}`}
        >
          <StatusIcon icon={state.icon} tone={state.tone} />
          <span className="min-w-0 break-words">{state.full}</span>
        </output>
        {canSend && (
          <button
            type="button"
            onClick={() => void send()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-indigo-700"
          >
            <Send size={13} aria-hidden /> {sendLabel(target.invite)}
          </button>
        )}
      </div>
    </section>
  )
}

/** One line for a list row: email status, copy link, send. */
export function TrialInviteInline({
  target,
  onSend,
  studentName,
}: {
  target: InviteTarget
  onSend: SendInvite
  studentName: string
}) {
  const { busy, send } = useInviteSender(target, onSend)
  const { copied, copy } = useCopy(target)
  const state = inviteState(target, busy)
  const canSend = target.parentEmail.trim() !== '' && !busy

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      <span
        title={state.full}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ring-1 ring-inset ${TONE_CLASS[state.tone]}`}
      >
        <StatusIcon icon={state.icon} tone={state.tone} />
        {state.short}
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copy ${studentName}’s class link`}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
      >
        {copied ? (
          <Check size={12} aria-hidden />
        ) : (
          <Link2 size={12} aria-hidden />
        )}
        {copied ? 'Copied' : 'Copy class link'}
      </button>
      {canSend && (
        <button
          type="button"
          onClick={() => void send()}
          aria-label={`${sendLabel(target.invite)} to ${studentName}’s parent`}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
        >
          <Send size={12} aria-hidden /> {sendLabel(target.invite)}
        </button>
      )}
    </div>
  )
}
