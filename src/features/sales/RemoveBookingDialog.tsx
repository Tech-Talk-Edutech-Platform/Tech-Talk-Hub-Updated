import { useState } from 'react'
import { MessageCircle, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { Modal } from '../../components/ui/Modal'
import { parentAlreadyMessaged } from './bookings'
import { problemText, useSalesData } from './salesDataContext'
import type { RemovalReason, TrialBooking } from './types'
import { REMOVAL_REASON_LABEL, REMOVAL_REASONS } from './types'
import { correctionMessage, trialTime, whatsappLink } from './whatsapp'

// The shared Modal is always light, so these skip the dark-mode variants.
const noteInput =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-hidden focus:ring-2 focus:ring-purple-500'
const keepButton =
  'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50'

/**
 * Confirms removing (soft-deleting) a booking made in error, then offers
 * "Undo" in a toast. The booking is kept under "Removed" and can be restored
 * while its time is still free.
 */
export function RemoveBookingDialog({
  booking,
  byRepId,
  onClose,
}: {
  booking: TrialBooking
  /** The rep removing it; null for an admin. */
  byRepId: string | null
  onClose: () => void
}) {
  const data = useSalesData()
  const [reason, setReason] = useState<RemovalReason>('mistake')
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const mentor = data.mentors.find((m) => m.id === booking.mentorId)
  const alreadyMessaged = parentAlreadyMessaged(booking, data.messages)
  const parentFirstName = booking.parentName.split(' ')[0]

  const remove = async () => {
    if (removing) return
    if (reason === 'other' && !note.trim()) {
      setProblem('Add a short note saying why.')
      return
    }
    setRemoving(true)
    try {
      await data.removeBooking(booking.id, {
        reason,
        note: note.trim(),
        byRepId,
      })
    } catch (error) {
      setProblem(problemText(error, 'Couldn’t remove it.'))
      setRemoving(false)
      return
    }
    onClose()
    toast(
      (shown) => (
        <span className="flex items-center gap-3 text-sm">
          <span>
            {booking.studentName}’s trial removed. The time is free again.
          </span>
          <button
            type="button"
            onClick={() => {
              toast.dismiss(shown.id)
              data
                .restoreBooking(booking.id)
                .then(() => toast.success('Booking restored.'))
                .catch((error: unknown) =>
                  toast.error(problemText(error, 'Couldn’t restore it.')),
                )
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-extrabold text-purple-700 hover:bg-purple-50"
          >
            <Undo2 size={14} aria-hidden /> Undo
          </button>
        </span>
      ),
      { duration: 10_000 },
    )
  }

  return (
    <Modal
      title="Remove this booking?"
      closeLabel="Keep the booking"
      onClose={onClose}
    >
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
        <strong>{booking.studentName}</strong> with{' '}
        {mentor?.name ?? 'the mentor'} · {trialTime(booking.start)}
        <span className="block text-xs text-slate-500">
          Parent: {booking.parentName}
        </span>
      </p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-bold">Why remove it?</legend>
        <div className="space-y-1.5">
          {REMOVAL_REASONS.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name="removal-reason"
                value={option}
                checked={reason === option}
                onChange={() => setReason(option)}
                className="size-4 accent-purple-600"
              />
              {REMOVAL_REASON_LABEL[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-sm font-bold">
        Note {reason === 'other' ? '' : '(optional)'}
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. Picked Kevin instead of Brian"
          className={noteInput}
        />
      </label>

      <p className="mt-4 text-xs leading-5 text-slate-600">
        The trial comes off {mentor?.name ?? 'the mentor'}’s calendar, the time
        opens up again and WhatsApp messages that haven’t gone out are stopped.
        It stays under “Removed”, where you can restore it while the time is
        free.
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Did the parent cancel? Use “Parent cancelled” instead, so it still
        counts in the numbers.
      </p>

      {alreadyMessaged && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          {parentFirstName} already has the WhatsApp confirmation. Let them know
          it was a mistake:
          <a
            href={whatsappLink(booking.parentPhone, correctionMessage(booking))}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-extrabold text-white hover:bg-emerald-700"
          >
            <MessageCircle size={14} aria-hidden /> Send a correction
          </a>
        </div>
      )}

      {problem && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
          {problem}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={keepButton}>
          Keep booking
        </button>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={removing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
        >
          <Trash2 size={16} aria-hidden />{' '}
          {removing ? 'Removing…' : 'Remove booking'}
        </button>
      </div>
    </Modal>
  )
}
