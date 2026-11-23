import { createPortal } from 'react-dom'
import type { RemoteVideoTrack } from 'livekit-client'
import type { LocalMedia } from '../../../hooks/classroom/useLocalMedia'
import type {
  LiveConnectionState,
  RemoteMedia,
} from '../../../hooks/classroom/useLiveKitRoom'
import { usePictureInPicture } from '../../../hooks/classroom/usePictureInPicture'
import { useAutoPip } from '../../../lib/classroom/autoPip'
import type { Recording } from '../../../hooks/classroom/useRecording'
import type {
  BadgeAnnouncement,
  MenuAction,
  PanelName,
  Participant,
  Reaction,
  VideoPlatform,
} from '../../../types/classroom'
import { Toaster } from '../ui/Toaster'
import { BadgeCelebration } from './BadgeCelebration'
import { ControlBar } from './ControlBar'
import { ExternalPlatformNotice } from './ExternalPlatformNotice'
import { ParticipantGrid } from './ParticipantGrid'
import { PipRoom } from './PipRoom'
import { ReactionLayer } from './ReactionLayer'
import { StageHeader } from './StageHeader'

type StageProps = {
  media: LocalMedia
  self: Participant & { speaking: boolean }
  participants: Participant[]
  remoteMedia: Record<string, RemoteMedia>
  liveConnection: LiveConnectionState
  liveError: string | null
  audioPlaybackBlocked: boolean
  onReconnect: () => void
  onEnableAudio: () => void
  /** Left out for the parent link: watchers don't invite people. */
  onShareCall?: () => void
  /** Parent link: watch and listen only, no camera, mic or reactions. */
  watchOnly: boolean
  reactions: Reaction[]
  /** The badge just given in class, shown to everyone for a few seconds. */
  celebration: BadgeAnnouncement | null
  recording: Recording
  canRecord: boolean
  onToggleRecording: () => void
  onToggleHand: () => void
  onReact: (emoji: string) => void
  panel: PanelName | null
  onTogglePanel: (name: PanelName) => void
  platform: VideoPlatform
  onSwitchBack: () => void
  onOpenSettings?: () => void
  moreActions: MenuAction[]
}

/** The video room (docs/breakdown/03-video-room.md). */
export function Stage({
  media,
  self,
  participants,
  remoteMedia,
  liveConnection,
  liveError,
  audioPlaybackBlocked,
  onReconnect,
  onEnableAudio,
  onShareCall,
  watchOnly,
  reactions,
  celebration,
  recording,
  canRecord,
  onToggleRecording,
  onToggleHand,
  onReact,
  panel,
  onTogglePanel,
  platform,
  onSwitchBack,
  onOpenSettings,
  moreActions,
}: StageProps) {
  const autoPip = useAutoPip()
  const {
    videoRef: pipVideoRef,
    pipWindow,
    active: pipActive,
    toggle: togglePip,
  } = usePictureInPicture({
    cam: media.cam,
    screen: media.screen,
    remote: featuredRemoteVideo(participants, remoteMedia),
    initial: self.initial,
    // Pop out on its own when you switch tabs, as Google Meet does, while the
    // class is on our own video (not an external platform). Settings has the
    // switch.
    auto: Boolean(platform.builtIn) && autoPip,
  })
  const external = !platform.builtIn
  // Parents watching (the parent link) are listed under People, not given a
  // tile: they're never on camera. They have no audio to play either.
  const onCamera = participants.filter((person) => !person.watching)

  return (
    <section
      data-surface="stage"
      aria-label="Video room"
      className="relative isolate min-w-0 flex-1 overflow-hidden bg-stage bg-[url(/stage-bg.svg)] bg-cover bg-bottom"
    >
      <StageHeader
        participantCount={participants.length}
        liveConnection={liveConnection}
        liveError={liveError}
        audioPlaybackBlocked={audioPlaybackBlocked}
        onReconnect={onReconnect}
        onEnableAudio={onEnableAudio}
        onShareCall={onShareCall}
        recording={recording.active}
        announcing={recording.announcing}
        pip={pipActive}
        onTogglePip={togglePip}
        onOpenSettings={onOpenSettings}
        moreActions={moreActions}
        stats={{
          cam: media.cam,
          mic: media.mic,
          screen: media.screen,
          recordingSince: recording.since,
          participants: participants.length,
        }}
      />

      {external ? (
        <ExternalPlatformNotice
          platform={platform}
          onSwitchBack={onSwitchBack}
        />
      ) : onCamera.length === 0 ? (
        <div className="absolute inset-x-3 top-[100px] bottom-[92px] grid place-items-center">
          <p className="max-w-[320px] rounded-[12px] bg-black/40 px-4 py-3 text-center text-[14px] leading-5 text-white backdrop-blur-sm">
            Waiting for the class to start. You’ll see and hear the tutor here
            as soon as they join.
          </p>
        </div>
      ) : (
        <div className="absolute inset-x-3 top-[100px] bottom-[92px]">
          <ParticipantGrid
            participants={onCamera}
            remoteMedia={remoteMedia}
            self={{
              cam: media.cam,
              screen: media.screen,
              speaking: self.speaking,
              mirror: media.mirror,
            }}
          />
        </div>
      )}

      <ReactionLayer reactions={reactions} participants={participants} />
      <BadgeCelebration award={celebration} />

      <ControlBar
        media={media}
        watchOnly={watchOnly}
        canRecord={canRecord}
        recording={recording.active}
        onToggleRecording={onToggleRecording}
        hand={self.hand}
        onToggleHand={onToggleHand}
        onReact={onReact}
        peopleOpen={panel === 'people'}
        onTogglePeople={() => onTogglePanel('people')}
        peopleCount={participants.length}
      />

      <Toaster className="bottom-[100px]" />

      {/* Source element for video Picture in Picture; never shown in the page. */}
      <video
        ref={pipVideoRef}
        muted
        playsInline
        className="pointer-events-none absolute size-px opacity-0"
      />

      {pipWindow &&
        createPortal(
          <PipRoom
            participants={onCamera}
            remoteMedia={remoteMedia}
            media={media}
            speaking={self.speaking}
            hand={self.hand}
            onToggleHand={onToggleHand}
            watchOnly={watchOnly}
          />,
          pipWindow.document.body,
        )}
    </section>
  )
}

/**
 * The video worth keeping an eye on from another tab: someone's screen share,
 * else the tutor's camera, else whoever is talking (with their camera on),
 * else the first camera.
 */
function featuredRemoteVideo(
  participants: Participant[],
  remoteMedia: Record<string, RemoteMedia>,
): RemoteVideoTrack | null {
  const others = participants.filter((person) => !person.isSelf)
  for (const person of others) {
    const screen = remoteMedia[person.id]?.screen
    if (screen) return screen
  }
  const cameraOf = (person: Participant) =>
    person.cam ? (remoteMedia[person.id]?.camera ?? null) : null
  const tutor = others.find((person) => person.host && cameraOf(person))
  if (tutor) return cameraOf(tutor)
  const speaker = others.find((person) => person.speaking && cameraOf(person))
  if (speaker) return cameraOf(speaker)
  for (const person of others) {
    const camera = cameraOf(person)
    if (camera) return camera
  }
  return null
}
