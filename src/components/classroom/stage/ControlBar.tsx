import { useRef, useState } from 'react'
import {
  CircleDot,
  Hand,
  Mic,
  MicOff,
  Monitor,
  Users,
  Video,
  VideoOff,
} from 'lucide-react'
import { REACTIONS } from '../../../data/classroom'
import type { LocalMedia } from '../../../hooks/classroom/useLocalMedia'
import { Popover } from '../ui/Popover'
import { StageButton } from './StageButton'

type ControlBarProps = {
  media: LocalMedia
  recording: boolean
  onToggleRecording: () => void
  hand: boolean
  onToggleHand: () => void
  onReact: (emoji: string) => void
  peopleOpen: boolean
  onTogglePeople: () => void
  peopleCount: number
}

/** Cam · Mic · Share · Record/Stop · React · People (docs/breakdown/03-video-room.md) */
export function ControlBar({
  media,
  recording,
  onToggleRecording,
  hand,
  onToggleHand,
  onReact,
  peopleOpen,
  onTogglePeople,
  peopleCount,
}: ControlBarProps) {
  const [reactOpen, setReactOpen] = useState(false)
  const reactRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="absolute inset-x-0 bottom-[6px] z-10 flex justify-center gap-3 max-sm:gap-2">
      <StageButton
        icon={media.cam ? Video : VideoOff}
        label="Cam"
        tone={media.cam ? 'dark' : 'muted'}
        busy={media.pending.cam}
        aria-label={media.cam ? 'Turn camera off' : 'Turn camera on'}
        aria-pressed={!!media.cam}
        onClick={media.toggleCam}
      />
      <StageButton
        icon={media.mic ? Mic : MicOff}
        label="Mic"
        tone={media.mic ? 'dark' : 'muted'}
        busy={media.pending.mic}
        aria-label={media.mic ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={!!media.mic}
        onClick={media.toggleMic}
      />
      <StageButton
        icon={Monitor}
        label="Share"
        tone={media.screen ? 'active' : 'dark'}
        busy={media.pending.screen}
        aria-label={
          media.screen ? 'Stop sharing your screen' : 'Share your screen'
        }
        aria-pressed={!!media.screen}
        onClick={media.toggleScreen}
      />
      <StageButton
        icon={CircleDot}
        label={recording ? 'Stop' : 'Record'}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
        aria-pressed={recording}
        onClick={onToggleRecording}
      />
      <StageButton
        ref={reactRef}
        icon={Hand}
        label="React"
        tone={reactOpen || hand ? 'active' : 'dark'}
        aria-label="React"
        aria-haspopup="dialog"
        aria-expanded={reactOpen}
        onClick={() => setReactOpen((o) => !o)}
      />
      <StageButton
        icon={Users}
        label="People"
        tone={peopleOpen ? 'active' : 'dark'}
        aria-label={`People (${peopleCount})`}
        aria-pressed={peopleOpen}
        onClick={onTogglePeople}
      />

      <Popover
        anchorRef={reactRef}
        open={reactOpen}
        onClose={() => setReactOpen(false)}
        placement="top"
        gap={12}
        label="Reactions"
        className="rounded-[10px] bg-white p-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.45)]"
      >
        <div className="flex items-center gap-0.5">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(emoji)}
              aria-label={`React ${emoji}`}
              className="press hover:bg-surface-2 grid size-11 place-items-center rounded-[8px] text-[26px]"
            >
              {emoji}
            </button>
          ))}
          <span aria-hidden="true" className="bg-line mx-1 h-8 w-px" />
          <button
            type="button"
            onClick={() => {
              onToggleHand()
              setReactOpen(false)
            }}
            aria-pressed={hand}
            className={`press flex h-11 items-center gap-2 rounded-[8px] px-3 text-[14px] font-medium ${
              hand ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface-2'
            }`}
          >
            <Hand size={18} strokeWidth={2} aria-hidden="true" />
            {hand ? 'Lower hand' : 'Raise hand'}
          </button>
        </div>
      </Popover>
    </div>
  )
}
