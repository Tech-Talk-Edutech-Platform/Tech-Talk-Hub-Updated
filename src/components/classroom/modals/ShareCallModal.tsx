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
}

export function ShareCallModal({
  open,
  onClose,
  guestLink,
}: ShareCallModalProps) {
  const [copied, setCopied] = useState(false)
  const isLocalAddress =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(guestLink)
      setCopied(true)
      toast('Call invite copied')
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
      <p className="mt-2 max-w-[390px] text-[14px] leading-5 text-muted">
        Share this link or scan the QR code on another device. Guests can enter
        their name before joining.
      </p>

      <div className="mt-6 flex justify-center rounded-[8px] bg-surface-2 p-4">
        <QRCodeSVG
          value={guestLink}
          size={192}
          level="M"
          marginSize={2}
          title="QR code to join this classroom call"
        />
      </div>

      <label
        htmlFor="classroom-invite-link"
        className="mt-5 block text-[13px] font-medium text-ink"
      >
        Guest link
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="classroom-invite-link"
          readOnly
          value={guestLink}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-[4px] border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={() => void copyInvite()}
          className="press hover:bg-brand-hover flex h-10 shrink-0 items-center gap-2 rounded-[4px] bg-brand px-3 text-[14px] font-medium text-white"
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
          Anyone with this invite can join the room (up to{' '}
          {CLASSROOM_BRAND.roomCapacity} people). Only share it with people you
          want in class.
        </span>
      </p>
      {isLocalAddress && (
        <p
          role="status"
          className="mt-3 rounded-[4px] bg-amber-50 px-3 py-2 text-[12.5px] leading-[18px] text-amber-900"
        >
          This is a local development address. Other devices cannot open it; use
          your deployed site or a network-accessible address to share.
        </p>
      )}
    </Modal>
  )
}
