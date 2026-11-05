import type { LocalMedia } from '../../../hooks/classroom/useLocalMedia'
import { usePictureInPicture } from '../../../hooks/classroom/usePictureInPicture'
import type { Recording } from '../../../hooks/classroom/useRecording'
import type {
  MenuAction,
  PanelName,
  Participant,
  Reaction,
  VideoPlatform,
} from '../../../types/classroom'
import { Toaster } from '../ui/Toaster'
import { ControlBar } from './ControlBar'
import { ExternalPlatformNotice } from './ExternalPlatformNotice'
import { ParticipantGrid } from './ParticipantGrid'
import { ReactionLayer } from './ReactionLayer'
import { StageHeader } from './StageHeader'

type StageProps = {
  media: LocalMedia
  self: Participant & { speaking: boolean }
  participants: Participant[]
  reactions: Reaction[]
  recording: Recording
  onToggleRecording: () => void
  onToggleHand: () => void
  onReact: (emoji: string) => void
  panel: PanelName | null
  onTogglePanel: (name: PanelName) => void
  platform: VideoPlatform
  onSwitchBack: () => void
  onOpenSettings: () => void
  moreActions: MenuAction[]
}

/** The video room (docs/breakdown/03-video-room.md). */
export function Stage({
  media,
  self,
  participants,
  reactions,
  recording,
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
  const {
    videoRef: pipVideoRef,
    active: pipActive,
    toggle: togglePip,
  } = usePictureInPicture({
    cam: media.cam,
    screen: media.screen,
    initial: self.initial,
  })
  const external = !platform.builtIn

  return (
    <section
      data-surface="stage"
      aria-label="Video room"
      className="bg-stage relative isolate min-w-0 flex-1 overflow-hidden bg-[url(/stage-bg.svg)] bg-cover bg-bottom"
    >
      <StageHeader
        participantCount={participants.length}
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
      ) : (
        <div className="absolute inset-x-3 bottom-[92px] top-[60px]">
          <ParticipantGrid
            participants={participants}
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

      <ControlBar
        media={media}
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

      {/* Source element for Picture in Picture; never shown in the page. */}
      <video
        ref={pipVideoRef}
        muted
        playsInline
        className="pointer-events-none absolute size-px opacity-0"
      />
    </section>
  )
}
