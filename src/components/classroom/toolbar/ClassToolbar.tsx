import { useRef, type Dispatch, type SetStateAction } from 'react'
import {
  Award,
  BookOpen,
  CloudUpload,
  LogOut,
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
  /**
   * 'teacher' runs the class (staff); 'learner' is a student or guest, who
   * only gets chat, the timer and Leave.
   */
  mode: 'teacher' | 'learner'
  /** The student badges go to; null when nobody is booked. */
  studentName: string | null
  badges: Badge[]
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
  onLeave: () => void
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
  mode,
  studentName,
  badges,
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
  onLeave,
  menu,
  setMenu,
}: ClassToolbarProps) {
  const badgeRef = useRef<HTMLButtonElement>(null)
  const alertRef = useRef<HTMLButtonElement>(null)
  const toggleMenu = (name: ToolbarMenu) =>
    setMenu((current) => (current === name ? null : name))
  const teacher = mode === 'teacher'
  const noStudent =
    'Invite a student first: Dashboard › My Classrooms › Invite students'

  return (
    <header className="relative z-20 flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line bg-white px-4 py-[8px] max-md:px-3">
      <div className="flex min-w-0 items-center gap-3 max-md:flex-1 md:shrink-0 md:pr-4">
        <BrandMark size={34} />
        <div className="min-w-0">
          <h1 className="truncate text-[13.5px] leading-5 font-semibold text-ink">
            {classroom.title}
          </h1>
          <p className="text-[11px] leading-4 text-muted tabular-nums">
            Classroom ID: {classroom.id}
          </p>
        </div>
      </div>

      <nav
        aria-label="Class tools"
        className="order-last flex min-w-0 flex-1 items-center gap-2 max-md:-mx-3 max-md:basis-full max-md:[scrollbar-width:none] max-md:overflow-x-auto max-md:px-3 max-md:py-1 md:order-none md:ml-1"
      >
        {teacher && (
          <>
            <ToolbarButton
              icon={CloudUpload}
              label="Submit project"
              onClick={() => onOpenModal('submit')}
              aria-haspopup="dialog"
              disabled={!studentName}
              title={studentName ? undefined : noStudent}
              className="disabled:opacity-50"
            />
            <ToolbarButton
              ref={badgeRef}
              icon={Award}
              label="Give badge"
              active={menu === 'badge'}
              aria-haspopup="dialog"
              aria-expanded={menu === 'badge'}
              disabled={!studentName}
              title={studentName ? undefined : noStudent}
              className="disabled:opacity-50"
              onClick={() => toggleMenu('badge')}
            />
            <ToolbarButton
              icon={BookOpen}
              label="Class details"
              active={panel === 'details'}
              aria-pressed={panel === 'details'}
              onClick={() => onTogglePanel('details')}
            />
          </>
        )}
        <ToolbarButton
          icon={MessageCircle}
          label="Chat"
          active={panel === 'chat'}
          aria-pressed={panel === 'chat'}
          badge={panel === 'chat' ? 0 : chatUnread}
          onClick={() => onTogglePanel('chat')}
        />
        {teacher && (
          <>
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
          </>
        )}
      </nav>

      <span
        className="rounded-[8px] bg-surface-2 px-2 py-1 text-[13.5px] font-semibold text-ink tabular-nums max-md:order-1"
        title="Class time"
        aria-label={`Class time ${formatElapsed(elapsedMs)}`}
      >
        {formatElapsed(elapsedMs)}
      </span>

      {teacher ? (
        <>
          <button
            type="button"
            onClick={onOpenHelp}
            className="press flex min-h-[32px] items-center justify-center gap-1.5 rounded-[8px] border border-brand/40 bg-white px-3 py-1 text-[13.5px] leading-4 font-medium text-brand hover:border-brand hover:bg-brand-soft max-md:order-1 max-md:px-2"
          >
            <MessageSquare size={13} strokeWidth={2} aria-hidden="true" />
            <span className="text-balance max-md:sr-only">Need help?</span>
          </button>

          <button
            type="button"
            onClick={onEndClass}
            className="press min-h-[32px] rounded-[8px] bg-accent-pink-strong px-[14px] py-1 text-[14px] leading-4 font-semibold text-balance text-white shadow-sm shadow-accent-pink/25 hover:bg-accent-pink-hover max-md:order-1"
          >
            End class
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onLeave}
          className="press flex min-h-[32px] items-center gap-1.5 rounded-[8px] bg-accent-pink-strong px-[14px] py-1 text-[14px] leading-4 font-semibold text-white hover:bg-accent-pink-hover max-md:order-1"
        >
          <LogOut size={14} strokeWidth={2.25} aria-hidden="true" />
          Leave
        </button>
      )}

      {teacher && studentName && (
        <GiveBadgePopover
          anchorRef={badgeRef}
          open={menu === 'badge'}
          onClose={() => setMenu(null)}
          badges={badges}
          studentName={studentName}
          onGive={(badge) => {
            setMenu(null)
            onGiveBadge(badge)
          }}
        />
      )}
      {teacher && (
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
      )}
    </header>
  )
}
