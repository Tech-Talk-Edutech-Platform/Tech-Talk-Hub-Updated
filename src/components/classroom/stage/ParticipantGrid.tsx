import { useRef } from 'react'
import { useElementSize } from '../../../hooks/useElementSize'
import type { Participant } from '../../../types/classroom'
import { ParticipantTile } from './ParticipantTile'
import { VideoView } from './VideoView'

const GAP = 12

/** Best grid for n 16:9 tiles in a box: try every column count, keep the largest tile. */
function fitGrid(n: number, width: number, height: number) {
  let best = { cols: 1, w: 0, h: 0 }
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    const w = Math.min(
      (width - GAP * (cols - 1)) / cols,
      ((height - GAP * (rows - 1)) / rows) * (16 / 9),
    )
    if (w > best.w) best = { cols, w, h: (w * 9) / 16 }
  }
  return best
}

/** This tab's own media; remote tabs share presence only, not video. */
export type GridSelf = {
  cam: MediaStream | null
  screen: MediaStream | null
  speaking: boolean
  mirror: boolean
}

type ParticipantGridProps = {
  participants: Participant[]
  self: GridSelf
}

export function ParticipantGrid({ participants, self }: ParticipantGridProps) {
  const box = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(box)

  const tileMedia = (person: Participant) =>
    person.isSelf
      ? { stream: self.cam, speaking: self.speaking, mirror: self.mirror }
      : { stream: null, speaking: false, mirror: false }

  const { cols, w, h } = fitGrid(participants.length, width, height)
  const narrow = width < 640

  return (
    <div ref={box} className="size-full">
      {self.screen ? (
        // Screen share takes the room; people move to a strip beside it.
        <div
          className={`flex size-full gap-3 ${narrow ? 'flex-col' : 'flex-row'}`}
        >
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[8px] bg-black/30">
            <VideoView stream={self.screen} fit="contain" />
            <span className="absolute top-2 left-2 rounded-[4px] bg-black/55 px-2 py-0.5 text-[12.5px] text-white">
              You are sharing your screen
            </span>
          </div>
          <div
            className={`flex shrink-0 gap-3 overflow-auto ${narrow ? 'h-[110px] flex-row' : 'w-[184px] flex-col'}`}
          >
            {participants.map((person) => (
              <ParticipantTile
                key={person.id}
                person={person}
                {...tileMedia(person)}
                width={184}
                height={104}
                compact
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex size-full content-center items-center justify-center">
          {width > 0 && (
            <div
              className="flex flex-wrap justify-center"
              style={{ gap: GAP, width: cols * w + GAP * (cols - 1) }}
            >
              {participants.map((person) => (
                <ParticipantTile
                  key={person.id}
                  person={person}
                  {...tileMedia(person)}
                  width={w}
                  height={h}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
