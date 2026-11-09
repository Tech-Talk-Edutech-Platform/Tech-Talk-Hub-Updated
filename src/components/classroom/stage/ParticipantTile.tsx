import { MicOff } from 'lucide-react'
import type { RemoteAudioTrack, RemoteVideoTrack } from 'livekit-client'
import type { Participant } from '../../../types/classroom'
import { HandBadge } from './HandBadge'
import { AudioView } from './AudioView'
import { VideoView } from './VideoView'

type ParticipantTileProps = {
  person: Participant
  stream: MediaStream | null
  audioStream?: MediaStream | null
  videoTrack?: RemoteVideoTrack | null
  audioTrack?: RemoteAudioTrack | null
  speaking: boolean
  mirror: boolean
  width: number
  height: number
  /** The smaller tiles in the screen-share strip. */
  compact?: boolean
}

/**
 * One person in the room. Camera off: the cream initial square from the
 * reference, with the orange dot while their mic is muted. Camera on: video.
 */
export function ParticipantTile({
  person,
  stream,
  audioStream = null,
  videoTrack = null,
  audioTrack = null,
  speaking,
  mirror,
  width,
  height,
  compact = false,
}: ParticipantTileProps) {
  const label = `${person.name}${person.isSelf ? ' (you)' : ''}`
  const showVideo = person.cam && (videoTrack !== null || stream !== null)
  // 80px square with a 36px initial, as in the reference; smaller in the share strip.
  const avatar = compact ? 56 : 80

  return (
    <figure
      aria-label={`${label}${person.mic ? '' : ', muted'}${person.hand ? ', hand raised' : ''}`}
      className="group relative grid shrink-0 place-items-center"
      style={{ width, height }}
    >
      {(audioTrack || audioStream) && (
        <AudioView stream={audioStream} track={audioTrack} />
      )}
      {showVideo ? (
        <div
          className={`relative size-full overflow-hidden rounded-[8px] bg-black/25 transition-shadow duration-150 ${
            speaking ? 'shadow-[0_0_0_3px_#fff]' : ''
          }`}
        >
          <VideoView stream={stream} track={videoTrack} mirror={mirror} />
          <figcaption className="absolute bottom-2 left-2 flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded-[4px] bg-black/55 px-2 py-0.5 text-[12.5px] text-white">
            {!person.mic && <MicOff size={12} aria-hidden="true" />}
            <span className="truncate">{label}</span>
          </figcaption>
        </div>
      ) : (
        <div className="relative flex flex-col items-center">
          <div
            className={`relative grid place-items-center rounded-[4px] bg-avatar text-ink transition-shadow duration-150 ${
              speaking ? 'shadow-[0_0_0_3px_#fff]' : ''
            }`}
            style={{
              width: avatar,
              height: avatar,
              fontSize: Math.round(avatar * 0.45),
            }}
          >
            {!person.mic && (
              <span
                aria-hidden="true"
                className="absolute top-[9px] left-[9px] size-2.5 rounded-full bg-stage-muted"
              />
            )}
            <span className="leading-none font-normal">{person.initial}</span>
            {person.hand && <HandBadge className="-top-3 -right-3" />}
          </div>
          <figcaption
            className={`max-w-[200px] truncate rounded-[4px] bg-black/45 px-2 py-0.5 text-[12.5px] text-white transition-opacity duration-150 ${
              compact
                ? 'mt-1.5'
                : 'absolute top-full mt-2 opacity-0 group-hover:opacity-100'
            }`}
          >
            {label}
          </figcaption>
        </div>
      )}
      {person.hand && showVideo && <HandBadge className="top-1.5 right-1.5" />}
    </figure>
  )
}
