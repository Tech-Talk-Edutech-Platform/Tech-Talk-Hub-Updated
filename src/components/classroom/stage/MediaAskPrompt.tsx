import { useEffect, useRef } from 'react'
import { Mic, Video } from 'lucide-react'

/** What the tutor asked this student to turn on, and the tutor's name. */
export type MediaAsk = { mic: boolean; cam: boolean; from: string }

type MediaAskPromptProps = {
  ask: MediaAsk
  onAccept: () => void
  onDismiss: () => void
}

/**
 * The tutor asked a student to turn on their mic or camera. One big button
 * does it, for children who struggle to find the controls. Browsers only
 * start a camera or mic for the person at the device, so this is a request.
 */
export function MediaAskPrompt({
  ask,
  onAccept,
  onDismiss,
}: MediaAskPromptProps) {
  const button = useRef<HTMLButtonElement>(null)
  // Ready for Enter or Space the moment it appears.
  useEffect(() => {
    button.current?.focus()
  }, [])

  const both = ask.mic && ask.cam
  const wants = both ? 'see and hear you' : ask.cam ? 'see you' : 'hear you'
  const action = both
    ? 'Turn on my camera and mic'
    : ask.cam
      ? 'Turn on my camera'
      : 'Turn on my microphone'

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[112px] z-40 flex justify-center">
      <section
        role="alertdialog"
        aria-labelledby="media-ask-title"
        aria-describedby="media-ask-body"
        className="pop pointer-events-auto w-full max-w-[400px] rounded-[14px] bg-white p-5 text-ink shadow-[0_24px_64px_-16px_rgb(0_0_0/0.55)]"
      >
        <h2
          id="media-ask-title"
          className="text-[19px] leading-6 font-semibold text-balance"
        >
          {ask.from} would like to {wants}
        </h2>
        <p id="media-ask-body" className="mt-1 text-[14px] text-muted">
          Tap the button. You can turn it off again any time.
        </p>
        <button
          ref={button}
          type="button"
          onClick={onAccept}
          className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-strong"
        >
          {ask.cam && <Video size={20} aria-hidden="true" />}
          {ask.mic && <Mic size={20} aria-hidden="true" />}
          {action}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="press mt-2 h-10 w-full rounded-[10px] text-[14px] text-ink-soft hover:bg-surface-2"
        >
          Not now
        </button>
      </section>
    </div>
  )
}
