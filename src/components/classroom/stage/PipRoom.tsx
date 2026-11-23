import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { RemoteVideoTrack } from 'livekit-client'
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
import { spotlightOf, tutorFirst } from '../../../lib/classroom/videoPriority'
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
  /** Parent link: no mic, camera or hand controls. */
  watchOnly: boolean
}

/**
 * The room in the floating Picture-in-Picture window. One big picture: a
 * screen share if there is one, else the tutor (or, for the tutor, the
 * student who is talking). Everyone else sits in a strip underneath, with
 * mic, camera and hand controls. No audio here; it keeps playing from the
 * class tab.
 */
export function PipRoom({
  participants,
  remoteMedia,
  media,
  speaking,
  hand,
  onToggleHand,
  watchOnly,
}: PipRoomProps) {
  const people = tutorFirst(participants)
  const others = people.filter((person) => !person.isSelf)

  const sharer = others.find((person) => remoteMedia[person.id]?.screen)
  const remoteShare = sharer ? (remoteMedia[sharer.id]?.screen ?? null) : null
  const sharing = media.screen !== null || remoteShare !== null

  const cameraOf = (person: Participant) =>
    person.isSelf ? null : (remoteMedia[person.id]?.camera ?? null)
  // Not sharing: the tutor; a tutor sees whoever is talking, else the first
  // student. Alone in the room, it's you.
  const featured = sharing
    ? null
    : (spotlightOf(people) ??
      others.find((person) => person.speaking && person.cam) ??
      others[0] ??
      people[0] ??
      null)
  const strip = people.filter((person) => person.id !== featured?.id)

  const isSpeaking = (person: Participant) =>
    person.isSelf ? speaking : !!person.speaking

  return (
    <div
      data-surface="stage"
      className="flex h-dvh flex-col gap-2 bg-stage p-2 text-white"
    >
      {sharing ? (
        <div className="relative min-h-0 flex-[3] overflow-hidden rounded-[8px] bg-black/30">
          <VideoView
            stream={media.screen}
            track={media.screen ? null : remoteShare}
            fit="contain"
          />
          <Caption>
            {media.screen
              ? 'You are sharing'
              : `${sharer?.name ?? 'Someone'} is sharing`}
          </Caption>
        </div>
      ) : (
        featured && (
          <PipTile
            person={featured}
            track={cameraOf(featured)}
            stream={featured.isSelf ? media.cam : null}
            mirror={featured.isSelf && media.mirror}
            speaking={isSpeaking(featured)}
            className="min-h-0 flex-[3]"
            large
          />
        )
      )}

      {strip.length > 0 && (
        <ul
          aria-label="People in the class"
          className="flex min-h-[64px] shrink-0 basis-[22%] gap-2 overflow-x-auto"
        >
          {strip.map((person) => (
            <li key={person.id} className="aspect-video h-full shrink-0">
              <PipTile
                person={person}
                track={cameraOf(person)}
                stream={person.isSelf ? media.cam : null}
                mirror={person.isSelf && media.mirror}
                speaking={isSpeaking(person)}
                className="size-full"
              />
            </li>
          ))}
        </ul>
      )}

      {!watchOnly && (
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
      )}
    </div>
  )
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <span className="absolute top-1.5 left-1.5 rounded-[6px] bg-black/55 px-1.5 py-0.5 text-[11px]">
      {children}
    </span>
  )
}

function PipTile({
  person,
  track,
  stream,
  mirror,
  speaking,
  className,
  large = false,
}: {
  person: Participant
  track: RemoteVideoTrack | null
  stream: MediaStream | null
  mirror: boolean
  speaking: boolean
  className: string
  /** The featured picture: bigger initial and name. */
  large?: boolean
}) {
  const showVideo = person.cam && (track !== null || stream !== null)
  return (
    <div
      className={`relative grid place-items-center overflow-hidden rounded-[8px] bg-black/25 transition-shadow duration-150 ${
        speaking ? 'shadow-[0_0_0_2px_#fff]' : ''
      } ${className}`}
    >
      {showVideo ? (
        <VideoView stream={stream} track={track} mirror={mirror} />
      ) : (
        <span
          className={`grid place-items-center rounded-[8px] bg-avatar text-ink ${
            large ? 'size-16 text-[28px]' : 'size-8 text-[15px]'
          }`}
        >
          {person.initial}
        </span>
      )}
      <span
        className={`absolute bottom-1 left-1 flex max-w-[calc(100%-8px)] items-center gap-1 rounded-[6px] bg-black/55 px-1.5 py-0.5 ${
          large ? 'text-[12px]' : 'text-[10.5px]'
        }`}
      >
        {!person.mic && <MicOff size={11} aria-hidden="true" />}
        <span className="truncate">
          {person.name}
          {person.isSelf ? ' (you)' : person.host ? ' · Tutor' : ''}
        </span>
      </span>
      {person.hand && <HandBadge className="top-1 right-1" />}
    </div>
  )
}
