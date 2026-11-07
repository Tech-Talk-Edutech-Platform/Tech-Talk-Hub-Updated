import { useRef, type Dispatch, type SetStateAction } from 'react'
import {
  Award,
  BookOpen,
  CloudUpload,
  MessageCircle,
  MessageSquare,
  Monitor,
  Send,
  Zap,
} from 'lucide-react'
import { formatElapsed } from '../../../lib/classroom/time'
import type {
  Badge,
  ClassAlert,
  ClassModal,
  Classroom,
  PanelName,
  ToolbarMenu,
} from '../../../types/classroom'
import { BrandMark } from '../brand/BrandMark'
import { GiveBadgePopover } from './GiveBadgePopover'
import { SendAlertMenu } from './SendAlertMenu'
import { ToolbarButton } from './ToolbarButton'

type ClassToolbarProps = {
  classroom: Classroom
  studentName: string
  elapsedMs: number
  now: number
  panel: PanelName | null
  chatUnread: number
  alertSentAt: Partial<Record<string, number>>
  onTogglePanel: (name: PanelName) => void
  onOpenModal: (name: ClassModal) => void
  onGiveBadge: (badge: Badge) => void
  onSendAlert: (alert: ClassAlert) => void
  onOpenHelp: () => void
  onEndClass: () => void
  /** Owned by the page so other surfaces (Class details) can open it. */
  menu: ToolbarMenu | null
  setMenu: Dispatch<SetStateAction<ToolbarMenu | null>>
}

/**
 * The class bar above the room (docs/breakdown/02-class-toolbar.md).
 * [mark] [title / classroom id] [actions…] [timer] [Need help?] [End class]
 */
export function ClassToolbar({
  classroom,
  studentName,
  elapsedMs,
  now,
  panel,
  chatUnread,
  alertSentAt,
  onTogglePanel,
  onOpenModal,
  onGiveBadge,
  onSendAlert,
  onOpenHelp,
  onEndClass,
  menu,
  setMenu,
}: ClassToolbarProps) {
  const badgeRef = useRef<HTMLButtonElement>(null)
  const alertRef = useRef<HTMLButtonElement>(null)
  const toggleMenu = (name: ToolbarMenu) =>
    setMenu((current) => (current === name ? null : name))

  return (
    <header className="relative z-20 flex min-h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line bg-white px-4 py-[7px] max-md:px-3">
      <div className="flex min-w-0 items-center gap-[29px] max-md:flex-1 max-md:gap-3 md:shrink-0">
        <BrandMark size={32} />
        <div className="min-w-0">
          <h1 className="truncate text-[13.5px] leading-5 font-semibold text-ink">
            {classroom.title}
          </h1>
          <p className="text-[11px] leading-4 text-muted">
            Classroom ID: {classroom.id}
          </p>
        </div>
      </div>

      <nav
        aria-label="Class tools"
        className="order-last flex min-w-0 flex-1 items-center gap-2 max-md:-mx-3 max-md:basis-full max-md:[scrollbar-width:none] max-md:overflow-x-auto max-md:px-3 max-md:py-1 md:order-none md:ml-1"
      >
        <ToolbarButton
          icon={CloudUpload}
          label="Submit project"
          onClick={() => onOpenModal('submit')}
          aria-haspopup="dialog"
        />
        <ToolbarButton
          ref={badgeRef}
          icon={Award}
          label="Give badge"
          active={menu === 'badge'}
          aria-haspopup="dialog"
          aria-expanded={menu === 'badge'}
          onClick={() => toggleMenu('badge')}
        />
        <ToolbarButton
          icon={BookOpen}
          label="Class details"
          active={panel === 'details'}
          aria-pressed={panel === 'details'}
          onClick={() => onTogglePanel('details')}
        />
        <ToolbarButton
          icon={MessageCircle}
          label="Chat"
          active={panel === 'chat'}
          aria-pressed={panel === 'chat'}
          badge={panel === 'chat' ? 0 : chatUnread}
          onClick={() => onTogglePanel('chat')}
        />
        <ToolbarButton
          ref={alertRef}
          icon={Send}
          label="Send alert"
          active={menu === 'alert'}
          aria-haspopup="menu"
          aria-expanded={menu === 'alert'}
          onClick={() => toggleMenu('alert')}
        />
        <ToolbarButton
          icon={Zap}
          label="AI tools"
          onClick={() => onOpenModal('ai')}
          aria-haspopup="dialog"
        />
        <ToolbarButton
          icon={Monitor}
          label="Switch platform"
          onClick={() => onOpenModal('platform')}
          aria-haspopup="dialog"
        />
      </nav>

      <span
        className="text-[13.5px] font-semibold text-ink tabular-nums max-md:order-1"
        title="Class time"
        aria-label={`Class time ${formatElapsed(elapsedMs)}`}
      >
        {formatElapsed(elapsedMs)}
      </span>

      <button
        type="button"
        onClick={onOpenHelp}
        className="press flex min-h-[30px] items-center justify-center gap-1.5 rounded-[3px] border border-brand bg-white px-3 py-1 text-[13.5px] leading-4 text-brand hover:bg-brand-soft max-md:order-1 max-md:px-2"
      >
        <MessageSquare size={13} strokeWidth={2} aria-hidden="true" />
        <span className="text-balance max-md:sr-only">Need help?</span>
      </button>

      <button
        type="button"
        onClick={onEndClass}
        className="press min-h-[30px] rounded-[3px] bg-brand px-[13px] py-1 text-[14px] leading-4 font-medium text-balance text-white hover:bg-brand-strong max-md:order-1"
      >
        End class
      </button>

      <GiveBadgePopover
        anchorRef={badgeRef}
        open={menu === 'badge'}
        onClose={() => setMenu(null)}
        studentName={studentName}
        onGive={(badge) => {
          setMenu(null)
          onGiveBadge(badge)
        }}
      />
      <SendAlertMenu
        anchorRef={alertRef}
        open={menu === 'alert'}
        onClose={() => setMenu(null)}
        sentAt={alertSentAt}
        now={now}
        onSend={(alert) => {
          setMenu(null)
          onSendAlert(alert)
        }}
      />
    </header>
  )
}
