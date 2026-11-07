import { formatClock } from '../../../lib/classroom/time'
import type { HelpMessage } from '../../../types/classroom'
import { BotAvatar } from './BotAvatar'

type HelpBubbleProps = { message: HelpMessage }

/** One message in the help chat: mine on the right, the bot's on the left. */
export function HelpBubble({ message }: HelpBubbleProps) {
  if (message.from === 'me') {
    return (
      <li className="flex flex-col items-end">
        <p className="max-w-[80%] rounded-[8px] bg-brand px-3 py-2 text-[13.5px] leading-5 text-white">
          {message.text}
        </p>
        <span className="mt-1 text-[11px] text-muted tabular-nums">
          {formatClock(message.at)}
        </span>
      </li>
    )
  }
  return (
    <li className="flex gap-3">
      <BotAvatar />
      <div className="min-w-0">
        <p className="rounded-[8px] bg-surface-2 px-2.5 py-2 text-[13.5px] leading-5 text-ink">
          {message.text}
        </p>
        <span className="mt-1 block text-[11px] text-muted tabular-nums">
          {formatClock(message.at)}
        </span>
      </div>
    </li>
  )
}
