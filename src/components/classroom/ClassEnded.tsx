import { formatElapsed } from '../../lib/classroom/time'
import type { ClassEndInfo } from '../../types/classroom'
import { BrandMark } from './brand/BrandMark'
import { Toaster } from './ui/Toaster'

type ClassEndedProps = {
  info: ClassEndInfo
  onRejoin: () => void
}

function endDetail(info: ClassEndInfo) {
  if (info.reason === 'left') {
    return 'The class is still running for everyone else.'
  }
  return info.by
    ? `${info.by} ended the class.`
    : 'The room is closed for everyone.'
}

/** After End class (or Leave room). Keeps the room's ground so the change reads as the same place. */
export function ClassEnded({ info, onRejoin }: ClassEndedProps) {
  const left = info.reason === 'left'

  return (
    <main
      data-surface="stage"
      className="bg-stage relative grid h-dvh place-items-center overflow-hidden bg-[url(/stage-bg.svg)] bg-cover bg-bottom p-4"
    >
      <div className="pop w-full max-w-[400px] rounded-[8px] bg-white p-8 text-center shadow-[0_24px_60px_-20px_rgb(0_0_0/0.5)]">
        <BrandMark size={44} className="mx-auto" />
        <h1 className="text-ink mt-5 text-[22px] font-semibold">
          {left ? 'You left the room' : 'Class ended'}
        </h1>
        <p className="text-ink-soft mt-1.5 text-[15px]">{endDetail(info)}</p>
        {!left && (
          <p className="text-muted mt-4 text-[14px]">
            {'Duration '}
            <span className="text-ink font-semibold tabular-nums">
              {formatElapsed(info.elapsedMs)}
            </span>
          </p>
        )}
        <button
          type="button"
          onClick={onRejoin}
          className="press bg-brand hover:bg-brand-strong mt-7 h-10 w-full rounded-[4px] text-[15px] font-medium text-white"
        >
          {left ? 'Rejoin the room' : 'Start a new class'}
        </button>
      </div>
      <Toaster className="bottom-10" />
    </main>
  )
}
