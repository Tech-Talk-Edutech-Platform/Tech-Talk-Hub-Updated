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
      <h2 id="end-title" className="text-ink pr-10 text-[20px] font-semibold">
        End this class?
      </h2>
      <p className="text-ink-soft mt-2 text-[15px] leading-[23px]">
        The class has run for{' '}
        <span className="text-ink font-medium tabular-nums">
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
          className="press border-line-strong text-ink hover:bg-surface-2 h-10 rounded-[4px] border px-4 text-[15px] font-medium"
        >
          Keep teaching
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="press bg-brand hover:bg-brand-strong h-10 rounded-[4px] px-4 text-[15px] font-medium text-white"
        >
          End class
        </button>
      </div>
    </Modal>
  )
}
