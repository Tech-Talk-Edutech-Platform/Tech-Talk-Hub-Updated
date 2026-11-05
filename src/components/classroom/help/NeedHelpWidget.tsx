import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChevronLeft, SendHorizontal, Sparkles, X } from 'lucide-react'
import { HELP_TOPICS } from '../../../data/classroom'
import { CLASSROOM_BRAND } from '../../../data/classroomBrand'
import {
  GREETING,
  replyForQuestion,
  replyForTopic,
} from '../../../lib/classroom/helpBot'
import { uid } from '../../../lib/classroom/uid'
import type { HelpMessage, HelpTopic } from '../../../types/classroom'
import { BrandMark } from '../brand/BrandMark'
import { BotAvatar } from './BotAvatar'
import { HelpBubble } from './HelpBubble'

const SKELETON_HEIGHTS = [64, 44]
const TYPING_DOTS = [0, 1, 2]

const initialThread = (): HelpMessage[] => {
  const at = Date.now()
  return GREETING.map((text) => ({ id: uid(), from: 'bot', text, at }))
}

function clearTimers(pending: Set<number>) {
  for (const handle of pending) clearTimeout(handle)
  pending.clear()
}

type NeedHelpWidgetProps = { onClose: () => void }

/**
 * Floating support chat, top-left over the page (docs/breakdown/11-need-help.md).
 * Loads with a skeleton, greets, offers topics, then becomes a conversation.
 */
export function NeedHelpWidget({ onClose }: NeedHelpWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [thread, setThread] = useState(initialThread)
  const [topic, setTopic] = useState<HelpTopic | null>(null)
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLOListElement>(null)
  const panelRef = useRef<HTMLDialogElement>(null)
  // Pending bot replies. Cleared in place (never replaced) so unmount clears them all.
  const timers = useRef(new Set<number>())

  const later = (run: () => void, ms: number) => {
    timers.current.add(window.setTimeout(run, ms))
  }

  const reset = () => {
    clearTimers(timers.current)
    setTopic(null)
    setTyping(false)
    setDraft('')
    setThread(initialThread())
  }

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650)
    panelRef.current?.focus()
    const pending = timers.current // a ref: listed below only because the lint can't prove it stable
    return () => {
      clearTimeout(t)
      clearTimers(pending)
    }
  }, [timers])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Keep the end of the conversation in view: the typing dots, or the last message.
  const tail = typing ? 'typing' : thread.at(-1)?.id
  useEffect(() => {
    const list = listRef.current
    if (list && tail) list.scrollTop = list.scrollHeight
  }, [tail])

  const botSays = (text: string) => {
    setTyping(true)
    later(() => {
      setTyping(false)
      setThread((t) => [...t, { id: uid(), from: 'bot', text, at: Date.now() }])
    }, 900)
  }

  const pickTopic = (picked: HelpTopic) => {
    setTopic(picked)
    setThread((t) => [
      ...t,
      { id: uid(), from: 'me', text: picked.label, at: Date.now() },
    ])
    botSays(replyForTopic(picked.id))
  }

  const ask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setThread((t) => [...t, { id: uid(), from: 'me', text, at: Date.now() }])
    botSays(replyForQuestion(text))
  }

  return (
    <dialog
      open
      ref={panelRef}
      aria-label="Need help?"
      tabIndex={-1}
      className="pop text-ink fixed bottom-5 left-5 top-[19px] z-50 flex h-auto w-[400px] origin-top-left flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_24px_64px_-16px_rgb(0_0_0/0.45)] outline-none max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-3 max-sm:w-auto"
    >
      <header className="bg-brand flex h-[78px] shrink-0 items-center gap-2.5 px-3 text-white">
        <button
          type="button"
          onClick={reset}
          aria-label="Back to topics"
          className="press grid size-8 place-items-center rounded-md hover:bg-white/15"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <span className="grid size-[34px] place-items-center rounded-full bg-white">
          <BrandMark size={28} radius={14} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16.5px] font-bold leading-6">Need help?</h2>
          <p className="text-[13px] leading-4 text-white/90">
            Response time within minutes
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close help"
          className="press grid size-8 place-items-center rounded-md hover:bg-white/15"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      {loading ? (
        <div
          className="flex flex-1 flex-col justify-end gap-4 px-4 pb-6"
          aria-busy="true"
          aria-label="Loading"
        >
          {SKELETON_HEIGHTS.map((height) => (
            <div key={height} className="flex items-end gap-3">
              <span className="skeleton size-[30px] shrink-0 rounded-full" />
              <span className="skeleton w-[72%]" style={{ height }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <ol
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-16"
            aria-live="polite"
          >
            {thread.map((message) => (
              <HelpBubble key={message.id} message={message} />
            ))}
            {typing && (
              <li className="flex gap-3" aria-label="Support is typing">
                <BotAvatar />
                <p className="bg-surface-2 flex items-center gap-1 rounded-[8px] px-3 py-3">
                  {TYPING_DOTS.map((dot) => (
                    <span
                      key={dot}
                      className="bg-muted size-1.5 rounded-full"
                      style={{
                        animation: `typing 1.2s ${dot * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </p>
              </li>
            )}
          </ol>

          {topic ? (
            <form
              onSubmit={ask}
              className="border-line flex shrink-0 items-center gap-2 border-t px-3 py-3"
            >
              <label htmlFor="help-input" className="sr-only">
                Message support
              </label>
              <input
                id="help-input"
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={topic.ai ? 'Ask a question' : 'Describe the issue'}
                className="border-line-strong placeholder:text-faint focus:border-brand h-10 flex-1 rounded-[6px] border px-3 text-[14px] outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send"
                className="press bg-brand hover:bg-brand-strong disabled:bg-brand-faded grid size-10 place-items-center rounded-[6px] text-white"
              >
                <SendHorizontal size={17} aria-hidden="true" />
              </button>
            </form>
          ) : (
            <div className="border-line shrink-0 border-t px-4 pb-4 pt-3">
              <ul className="flex flex-wrap gap-x-[7px] gap-y-2">
                {HELP_TOPICS.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => pickTopic(option)}
                      className="press border-brand/70 text-ink hover:bg-brand-soft flex h-8 items-center gap-1.5 rounded-[6px] border px-2 text-[13px]"
                    >
                      {option.ai && (
                        <Sparkles
                          size={13}
                          aria-hidden="true"
                          className="text-brand"
                        />
                      )}
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <footer className="bg-surface-2/70 text-muted shrink-0 py-2 text-center text-[11px]">
        {CLASSROOM_BRAND.supportName}
      </footer>
    </dialog>
  )
}
