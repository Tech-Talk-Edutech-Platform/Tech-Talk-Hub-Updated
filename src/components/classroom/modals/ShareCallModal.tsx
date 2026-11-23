import { useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { CLASSROOM_BRAND } from '../../../data/classroomBrand'
import { toast } from '../../../lib/classroom/toast'
import { Modal } from '../ui/Modal'

type ShareCallModalProps = {
  open: boolean
  onClose: () => void
  guestLink: string
  /** The watch-only link for parents. */
  parentLink: string
}

type LinkKind = 'guest' | 'parent'

const LINKS: {
  kind: LinkKind
  label: string
  intro: string
  note: string
}[] = [
  {
    kind: 'guest',
    label: 'Student',
    intro:
      'Share this link or scan the QR code on another device. Guests enter their name, then join with their camera and mic.',
    note: 'Anyone with this link can join the class and talk',
  },
  {
    kind: 'parent',
    label: 'Parent (watch only)',
    intro:
      'For parents: they open it in their browser, enter their name and watch the class. Nothing to download or sign in to.',
    note: 'Anyone with this link can watch and listen. They can’t use a camera or mic, or send chat messages',
  },
]

export function ShareCallModal({
  open,
  onClose,
  guestLink,
  parentLink,
}: ShareCallModalProps) {
  const [kind, setKind] = useState<LinkKind>('guest')
  const [copied, setCopied] = useState(false)
  const isLocalAddress =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
  const current = LINKS.find((option) => option.kind === kind) ?? LINKS[0]
  const link = kind === 'parent' ? parentLink : guestLink

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast(kind === 'parent' ? 'Parent link copied' : 'Call invite copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Couldn’t copy. Your browser blocked clipboard access.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={500}
      labelledBy="share-call-title"
      padding="p-8"
    >
      <h2 id="share-call-title" className="text-[22px] font-semibold text-ink">
        Invite people to the call
      </h2>

      <fieldset className="mt-4 grid min-w-0 grid-cols-2 gap-1 rounded-[10px] bg-surface-2 p-1">
        <legend className="sr-only">Who the link is for</legend>
        {LINKS.map((option) => (
          <button
            key={option.kind}
            type="button"
            aria-pressed={kind === option.kind}
            onClick={() => {
              setKind(option.kind)
              setCopied(false)
            }}
            className={`press h-9 rounded-[8px] px-2 text-[13.5px] font-medium ${
              kind === option.kind
                ? 'bg-white text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      <p className="mt-3 max-w-[420px] text-[14px] leading-5 text-muted">
        {current.intro}
      </p>

      <div className="mt-5 flex justify-center rounded-[8px] bg-surface-2 p-4">
        <QRCodeSVG
          value={link}
          size={192}
          level="M"
          marginSize={2}
          title={
            kind === 'parent'
              ? 'QR code to watch this class'
              : 'QR code to join this classroom call'
          }
        />
      </div>

      <label
        htmlFor="classroom-invite-link"
        className="mt-5 block text-[13px] font-medium text-ink"
      >
        {kind === 'parent' ? 'Parent link' : 'Guest link'}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="classroom-invite-link"
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-[8px] border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={() => void copyInvite()}
          className="press flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-brand px-3 text-[14px] font-medium text-white hover:bg-brand-strong"
        >
          {copied ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Copy size={16} aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-[18px] text-muted">
        <Link2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {current.note} (up to {CLASSROOM_BRAND.roomCapacity} people in the
          room). Only share it with people you trust.
        </span>
      </p>
      {isLocalAddress && (
        <output className="mt-3 block rounded-[8px] bg-callout px-3 py-2 text-[12.5px] leading-[18px] text-callout-ink">
          This is a local development address. Other devices cannot open it; use
          your deployed site or a network-accessible address to share.
        </output>
      )}
    </Modal>
  )
}
