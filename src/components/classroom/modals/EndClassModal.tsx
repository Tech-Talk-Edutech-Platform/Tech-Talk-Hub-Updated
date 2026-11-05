import { formatElapsed } from '../../../lib/classroom/time'
import { Modal } from '../ui/Modal'

type EndClassModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  elapsedMs: number
  recording: boolean
  participantCount: number
}

export function EndClassModal({
  open,
  onClose,
  onConfirm,
  elapsedMs,
  recording,
  participantCount,
}: EndClassModalProps) {
  return (
    <Modal open={open} onClose={onClose} width={448} labelledBy="end-title">
      <h2 id="end-title" className="pr-10 text-[20px] font-semibold text-ink">
        End this class?
      </h2>
      <p className="mt-2 text-[15px] leading-[23px] text-ink-soft">
        The class has run for{' '}
        <span className="font-medium text-ink tabular-nums">
          {formatElapsed(elapsedMs)}
        </span>
        . Ending it closes the room for{' '}
        {participantCount > 1 ? `all ${participantCount} people` : 'everyone'}
        {recording
          ? ' and stops the recording, which downloads to this computer.'
          : '.'}
      </p>
      <div className="mt-8 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="press h-10 rounded-[4px] border border-line-strong px-4 text-[15px] font-medium text-ink hover:bg-surface-2"
        >
          Keep teaching
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="press h-10 rounded-[4px] bg-brand px-4 text-[15px] font-medium text-white hover:bg-brand-strong"
        >
          End class
        </button>
      </div>
    </Modal>
  )
}
