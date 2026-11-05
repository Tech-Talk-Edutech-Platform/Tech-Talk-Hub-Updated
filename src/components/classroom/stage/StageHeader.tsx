import { useRef, useState } from 'react'
import {
  ChartNoAxesColumn,
  Ellipsis,
  PictureInPicture2,
  Settings,
} from 'lucide-react'
import { CLASSROOM_BRAND } from '../../../data/classroomBrand'
import type { MenuAction } from '../../../types/classroom'
import { BrandMark } from '../brand/BrandMark'
import { MoreMenu } from './MoreMenu'
import { ParticipantPill } from './ParticipantPill'
import { StageIconButton } from './StageIconButton'
import { StatsPopover, type RoomStats } from './StatsPopover'

type HeaderMenu = 'stats' | 'more'

type StageHeaderProps = {
  participantCount: number
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
        <BrandMark size={40} radius={4} />
        <span className="text-stage-ink truncate pr-1 text-[26px] font-bold leading-none tracking-[-0.015em] max-sm:hidden">
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
          onClick={onTogglePip}
          aria-pressed={pip}
          className={`press flex h-10 items-center gap-2 rounded-[6px] px-2.5 text-[15px] ${
            pip
              ? 'text-stage bg-white'
              : 'bg-stage-control hover:bg-stage-control-hover text-white'
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
