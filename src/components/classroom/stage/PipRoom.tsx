import type { ComponentPropsWithoutRef } from 'react'
import {
  Hand,
  Mic,
  MicOff,
  Video,
  VideoOff,
  type LucideIcon,
} from 'lucide-react'
import type { LocalMedia } from '../../../hooks/classroom/useLocalMedia'
import type { RemoteMedia } from '../../../hooks/classroom/useLiveKitRoom'
import type { Participant } from '../../../types/classroom'
import { HandBadge } from './HandBadge'
import { VideoView } from './VideoView'

type PipButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  icon: LucideIcon
  label: string
  /** 'muted' is the pink "device off" colour; 'on' is white. */
  tone: 'dark' | 'muted' | 'on'
}

const TONES = {
  dark: 'bg-stage-control text-white hover:bg-stage-control-hover',
  muted: 'bg-stage-muted text-white hover:bg-stage-muted-hover',
  on: 'bg-white text-stage hover:bg-white/90',
}

function PipButton({ icon: Icon, label, tone, ...rest }: PipButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`press grid size-10 place-items-center rounded-[10px] ${TONES[tone]}`}
      {...rest}
    >
      <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
    </button>
  )
}

type PipRoomProps = {
  participants: Participant[]
  remoteMedia: Record<string, RemoteMedia>
  media: LocalMedia
  speaking: boolean
  hand: boolean
  onToggleHand: () => void
}

/**
 * The room in the floating Picture-in-Picture window: whoever is sharing,
 * everyone's video (other people first, you last), and mic, camera and hand
 * controls. No audio here; it keeps playing from the class tab.
 */
export function PipRoom({
  participants,
  remoteMedia,
  media,
  speaking,
  hand,
  onToggleHand,
}: PipRoomProps) {
  const others = participants.filter((person) => !person.isSelf)
  const self = participants.find((person) => person.isSelf)
  const people = self ? [...others, self] : others

  const sharer = others.find((person) => remoteMedia[person.id]?.screen)
  const remoteShare = sharer ? (remoteMedia[sharer.id]?.screen ?? null) : null
  const sharing = media.screen !== null || remoteShare !== null

  return (
    <div
      data-surface="stage"
      className="flex h-dvh flex-col gap-2 bg-stage p-2 text-white"
    >
      {sharing && (
        <div className="relative min-h-0 flex-[3] overflow-hidden rounded-[8px] bg-black/30">
          <VideoView
            stream={media.screen}
            track={media.screen ? null : remoteShare}
            fit="contain"
          />
          <span className="absolute top-1.5 left-1.5 rounded-[6px] bg-black/55 px-1.5 py-0.5 text-[11px]">
            {media.screen
              ? 'You are sharing'
              : `${sharer?.name ?? 'Someone'} is sharing`}
          </span>
        </div>
      )}

      <ul
        aria-label="People in the class"
        className="grid min-h-0 flex-[2] grid-cols-[repeat(auto-fill,minmax(130px,1fr))] content-start gap-2 overflow-y-auto"
      >
        {people.map((person) => {
          const isSpeaking = person.isSelf ? speaking : !!person.speaking
          const track = person.isSelf
            ? null
            : (remoteMedia[person.id]?.camera ?? null)
          const stream = person.isSelf ? media.cam : null
          const showVideo = person.cam && (track !== null || stream !== null)
          return (
            <li
              key={person.id}
              className={`relative grid aspect-video place-items-center overflow-hidden rounded-[8px] bg-black/25 transition-shadow duration-150 ${
                isSpeaking ? 'shadow-[0_0_0_2px_#fff]' : ''
              }`}
            >
              {showVideo ? (
                <VideoView
                  stream={stream}
                  track={track}
                  mirror={person.isSelf && media.mirror}
                />
              ) : (
                <span className="grid size-11 place-items-center rounded-[8px] bg-avatar text-[20px] text-ink">
                  {person.initial}
                </span>
              )}
              <span className="absolute bottom-1 left-1 flex max-w-[calc(100%-8px)] items-center gap-1 rounded-[6px] bg-black/55 px-1.5 py-0.5 text-[11px]">
                {!person.mic && <MicOff size={11} aria-hidden="true" />}
                <span className="truncate">
                  {person.name}
                  {person.isSelf ? ' (you)' : ''}
                </span>
              </span>
              {person.hand && <HandBadge className="top-1 right-1" />}
            </li>
          )
        })}
      </ul>

      <div className="flex shrink-0 items-center justify-center gap-2">
        <PipButton
          icon={media.mic ? Mic : MicOff}
          label={media.mic ? 'Turn microphone off' : 'Turn microphone on'}
          tone={media.mic ? 'dark' : 'muted'}
          aria-pressed={!!media.mic}
          disabled={media.pending.mic}
          onClick={media.toggleMic}
        />
        <PipButton
          icon={media.cam ? Video : VideoOff}
          label={media.cam ? 'Turn camera off' : 'Turn camera on'}
          tone={media.cam ? 'dark' : 'muted'}
          aria-pressed={!!media.cam}
          disabled={media.pending.cam}
          onClick={media.toggleCam}
        />
        <PipButton
          icon={Hand}
          label={hand ? 'Lower hand' : 'Raise hand'}
          tone={hand ? 'on' : 'dark'}
          aria-pressed={hand}
          onClick={onToggleHand}
        />
      </div>
    </div>
  )
}
