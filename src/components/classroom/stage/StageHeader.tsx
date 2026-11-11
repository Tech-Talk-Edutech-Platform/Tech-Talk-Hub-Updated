import { useRef, useState } from 'react'
import {
  ChartNoAxesColumn,
  Ellipsis,
  PictureInPicture2,
  Share2,
  Settings,
} from 'lucide-react'
import { CLASSROOM_BRAND } from '../../../data/classroomBrand'
import type { LiveConnectionState } from '../../../hooks/classroom/useLiveKitRoom'
import type { MenuAction } from '../../../types/classroom'
import { BrandMark } from '../brand/BrandMark'
import { MoreMenu } from './MoreMenu'
import { ParticipantPill } from './ParticipantPill'
import { StageIconButton } from './StageIconButton'
import { StatsPopover, type RoomStats } from './StatsPopover'

type HeaderMenu = 'stats' | 'more'

type StageHeaderProps = {
  participantCount: number
  liveConnection: LiveConnectionState
  liveError: string | null
  audioPlaybackBlocked: boolean
  onReconnect: () => void
  onEnableAudio: () => void
  onShareCall: () => void
  recording: boolean
  announcing: boolean
  pip: boolean
  onTogglePip: () => void
  stats: RoomStats
  onOpenSettings: () => void
  moreActions: MenuAction[]
}

/** Brand, participant pill and the room's top-right controls. */
export function StageHeader({
  participantCount,
  liveConnection,
  liveError,
  audioPlaybackBlocked,
  onReconnect,
  onEnableAudio,
  onShareCall,
  recording,
  announcing,
  pip,
  onTogglePip,
  stats,
  onOpenSettings,
  moreActions,
}: StageHeaderProps) {
  const [open, setOpen] = useState<HeaderMenu | null>(null)
  const statsRef = useRef<HTMLButtonElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const toggle = (name: HeaderMenu) =>
    setOpen((current) => (current === name ? null : name))

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2">
      <div className="pointer-events-auto flex min-w-0 items-center gap-2">
        <BrandMark size={40} />
        <span className="truncate pr-1 text-[24px] leading-none font-bold tracking-[-0.02em] text-stage-ink max-sm:hidden">
          {CLASSROOM_BRAND.name}
        </span>
        <ParticipantPill
          count={participantCount}
          recording={recording}
          announcing={announcing}
        />
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onShareCall}
          aria-label="Share call invite"
          aria-haspopup="dialog"
          className="press flex h-10 items-center gap-2 rounded-[10px] bg-stage-control px-2.5 text-[14px] font-medium text-white hover:bg-stage-control-hover"
        >
          <Share2 size={18} strokeWidth={1.9} aria-hidden="true" />
          <span className="max-md:sr-only">Invite</span>
        </button>
        <button
          type="button"
          onClick={onTogglePip}
          aria-pressed={pip}
          className={`press flex h-10 items-center gap-2 rounded-[10px] px-2.5 text-[15px] ${
            pip
              ? 'bg-white text-stage'
              : 'bg-stage-control text-white hover:bg-stage-control-hover'
          }`}
        >
          <PictureInPicture2 size={24} strokeWidth={1.75} aria-hidden="true" />
          <span className="max-md:sr-only">Picture in Picture</span>
        </button>
        <StageIconButton
          ref={statsRef}
          icon={ChartNoAxesColumn}
          label="Connection stats"
          iconSize={20}
          active={open === 'stats'}
          aria-expanded={open === 'stats'}
          onClick={() => toggle('stats')}
        />
        <StageIconButton
          icon={Settings}
          label="Settings"
          onClick={onOpenSettings}
          aria-haspopup="dialog"
        />
        <StageIconButton
          ref={moreRef}
          icon={Ellipsis}
          label="More"
          active={open === 'more'}
          aria-haspopup="menu"
          aria-expanded={open === 'more'}
          onClick={() => toggle('more')}
        />
      </div>

      <output
        aria-live="polite"
        className="pointer-events-auto absolute top-[48px] left-0 flex max-w-[min(560px,calc(100vw-24px))] items-center gap-2 rounded-[10px] bg-black/40 px-2.5 py-1.5 text-[12px] text-white shadow-sm backdrop-blur-sm"
      >
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${
            liveConnection === 'connected'
              ? 'bg-emerald-400'
              : liveConnection === 'connecting'
                ? 'animate-pulse bg-amber-300'
                : 'bg-stage-muted'
          }`}
        />
        <span className="min-w-0">
          {liveConnection === 'connected'
            ? 'Live call connected'
            : liveConnection === 'connecting'
              ? 'Connecting to live call…'
              : liveConnection === 'error'
                ? liveError || 'Live call unavailable'
                : 'Not connected to live call'}
        </span>
        {(liveConnection === 'error' || liveConnection === 'disconnected') && (
          <button
            type="button"
            onClick={onReconnect}
            className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-white underline underline-offset-2 hover:bg-white/10"
          >
            Retry
          </button>
        )}
        {audioPlaybackBlocked && liveConnection === 'connected' && (
          <button
            type="button"
            onClick={onEnableAudio}
            className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-white underline underline-offset-2 hover:bg-white/10"
          >
            Enable audio
          </button>
        )}
      </output>

      <StatsPopover
        anchorRef={statsRef}
        open={open === 'stats'}
        onClose={() => setOpen(null)}
        stats={stats}
      />
      <MoreMenu
        anchorRef={moreRef}
        open={open === 'more'}
        onClose={() => setOpen(null)}
        actions={moreActions}
      />
    </div>
  )
}
