import type { CSSProperties } from 'react'
import type { Participant, Reaction } from '../../../types/classroom'

type ReactionLayerProps = {
  reactions: Reaction[]
  participants: Participant[]
}

/** Emoji that float up from the control bar. Everyone in the room sees them. */
export function ReactionLayer({ reactions, participants }: ReactionLayerProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-[90px] z-20 h-0"
    >
      {reactions.map((reaction) => {
        const sender = participants.find((p) => p.id === reaction.fromId)
        const style: CSSProperties & { '--drift': string } = {
          '--drift': `${reaction.drift}px`,
          marginLeft: reaction.drift * 2,
          animation: 'float-up 3s var(--ease-out) forwards',
        }
        return (
          <div
            key={reaction.id}
            className="reaction-float absolute left-1/2 flex flex-col items-center gap-1"
            style={style}
          >
            <span className="text-[40px] leading-none">{reaction.emoji}</span>
            {sender && !sender.isSelf && (
              <span className="rounded-[8px] bg-black/50 px-1.5 py-0.5 text-[11.5px] text-white">
                {sender.name}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
