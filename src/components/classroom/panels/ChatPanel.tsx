import { useEffect, useRef, useState } from 'react'
import { MessageCircle, SendHorizontal } from 'lucide-react'
import { formatClock } from '../../../lib/classroom/time'
import type { ChatMessage } from '../../../types/classroom'
import { SidePanel } from './SidePanel'

const LIMIT = 2000
/** Messages from one person within this window share a header. */
const GROUP_MS = 60_000

type ChatPanelProps = {
  messages: ChatMessage[]
  selfId: string
  onSend: (text: string) => void
  onClose: () => void
  draft: string
  onDraftChange: (draft: string) => void
}

/** Room chat (docs/breakdown/05-chat.md). Enter sends, Shift + Enter adds a line. */
export function ChatPanel({
  messages,
  selfId,
  onSend,
  onClose,
  draft,
  onDraftChange,
}: ChatPanelProps) {
  const listRef = useRef<HTMLOListElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Scroll to the newest message whenever one arrives.
  const lastMessageId = messages.at(-1)?.id
  useEffect(() => {
    const list = listRef.current
    if (list && lastMessageId) list.scrollTop = list.scrollHeight
  }, [lastMessageId])

  const text = draft.trim()
  const send = () => {
    if (!text) return
    onSend(text)
    onDraftChange('')
  }

  return (
    <SidePanel
      title="Chat"
      labelId="chat-title"
      onClose={onClose}
      footer={
        <form
          className="shrink-0 border-t border-line px-3 pt-3 pb-2"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="chat-input">
              Send a message
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={2}
              maxLength={LIMIT}
              value={draft}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault()
                  send()
                }
              }}
              placeholder={'Send a message\nPress Shift + Enter for new line'}
              className={`[field-sizing:content] max-h-32 min-h-[42px] flex-1 resize-none border-b-2 bg-transparent py-1 text-[14px] leading-[18px] text-ink outline-none placeholder:text-[13px] placeholder:text-muted ${
                focused ? 'border-brand' : 'border-transparent'
              }`}
            />
            <button
              type="submit"
              disabled={!text}
              className="press mb-1 flex h-[30px] items-center gap-1.5 rounded-[8px] bg-brand px-2.5 text-[14px] font-medium text-white hover:bg-brand-strong disabled:bg-brand-faded"
            >
              Send
              <SendHorizontal size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <p
            className="mt-0.5 text-right text-[11px] text-muted tabular-nums"
            aria-live="off"
          >
            {draft.length}/{LIMIT}
          </p>
        </form>
      }
    >
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-6 pb-16 text-center">
          <MessageCircle
            size={88}
            strokeWidth={1.1}
            aria-hidden="true"
            className="text-line-strong"
          />
          <p className="mt-4 text-[15px] text-muted">No messages yet</p>
          <p className="mt-1 max-w-[220px] text-[12.5px] leading-[18px] text-faint">
            Messages reach everyone in the room, including other tabs.
          </p>
        </div>
      ) : (
        <ol
          ref={listRef}
          className="flex h-full flex-col gap-3 overflow-y-auto px-3 py-4"
          aria-live="polite"
        >
          {messages.map((message, i) => {
            const mine = message.from.id === selfId
            const previous = i > 0 ? messages[i - 1] : undefined
            const grouped =
              previous !== undefined &&
              previous.from.id === message.from.id &&
              message.at - previous.at < GROUP_MS
            return (
              <li
                key={message.id}
                className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${grouped ? '-mt-2' : ''}`}
              >
                {!grouped && (
                  <p className="mb-1 text-[12px] text-muted">
                    <span className="font-semibold text-ink-soft">
                      {mine ? 'You' : message.from.name}
                    </span>{' '}
                    ·{' '}
                    <span className="tabular-nums">
                      {formatClock(message.at)}
                    </span>
                  </p>
                )}
                <p
                  className={`max-w-[88%] rounded-[8px] px-3 py-2 text-[14px] leading-5 break-words whitespace-pre-wrap ${
                    mine ? 'bg-brand text-white' : 'bg-surface-2 text-ink'
                  }`}
                >
                  {message.text}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </SidePanel>
  )
}
