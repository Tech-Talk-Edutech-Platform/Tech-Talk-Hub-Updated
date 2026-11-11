import { useState } from 'react'
import {
  BookOpen,
  ChevronLeft,
  Compass,
  Copy,
  Heart,
  Send,
  Smile,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { AI_TOOLS, generate } from '../../../lib/classroom/aiTools'
import { copyText } from '../../../lib/classroom/clipboard'
import type {
  Activity,
  AiToolIcon,
  AiToolId,
  Student,
} from '../../../types/classroom'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

const ICONS: Record<AiToolIcon, LucideIcon> = {
  smile: Smile,
  book: BookOpen,
  heart: Heart,
  compass: Compass,
}

/** Explain and Hint still work for a class with no activities. */
const GENERAL_ACTIVITY: Activity = {
  id: 'general',
  title: 'today’s lesson',
  outline: 'build something small that works, then make it your own.',
  project: '',
}

type AiToolsModalProps = {
  open: boolean
  onClose: () => void
  student: Student
  activities: Activity[]
  onSendToChat: (text: string) => void
}

/** "AI teaching tools" (docs/breakdown/09-ai-tools.md). */
export function AiToolsModal({
  open,
  onClose,
  student,
  activities,
  onSendToChat,
}: AiToolsModalProps) {
  const [toolId, setToolId] = useState<AiToolId | null>(null)
  const [activityId, setActivityId] = useState(activities[0]?.id ?? '')
  const activity =
    activities.find((a) => a.id === activityId) ??
    activities[0] ??
    GENERAL_ACTIVITY
  const activityOptions = activities.map((option) => ({
    value: option.id,
    label: option.title,
  }))
  const tool = AI_TOOLS.find((t) => t.id === toolId)
  const result = tool ? generate(tool.id, { student, activity }) : null
  const needsActivity = toolId === 'explain' || toolId === 'hint'
  const canSend = toolId === 'encourage' || toolId === 'icebreaker'

  return (
    <Modal open={open} onClose={onClose} width={672} labelledBy="ai-title">
      <div className="flex items-center gap-3 pr-10">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
          <Zap size={20} strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <h2
            id="ai-title"
            className="text-[20px] leading-7 font-semibold text-ink"
          >
            {tool ? tool.title : 'AI teaching tools'}
          </h2>
          <p className="text-[15px] text-ink-soft">
            {student.grade
              ? `${student.name} · ${student.grade}`
              : student.name}
          </p>
        </div>
      </div>

      {result ? (
        <div className="mt-6">
          {needsActivity && activityOptions.length > 0 && (
            <div className="mb-5">
              <Select
                label="Activity"
                value={activityId}
                onChange={setActivityId}
                options={activityOptions}
              />
            </div>
          )}
          <div
            className="rounded-[10px] border border-line bg-surface-2/50 px-4 py-4"
            aria-live="polite"
          >
            <h3 className="text-[15.5px] font-semibold text-ink">
              {result.title}
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-[15px] leading-[23px] text-ink-soft">
              {result.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <p className="mt-2 text-[12.5px] text-muted">
            Suggestions come from lesson templates, not a live model.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setToolId(null)}
              className="press -ml-2 flex h-10 items-center gap-1 rounded-[8px] px-2 text-[15px] font-medium text-ink-soft hover:text-ink"
            >
              <ChevronLeft size={18} aria-hidden="true" /> All tools
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyText(result.body.join('\n'), 'Copied')}
                className="press flex h-10 items-center gap-2 rounded-[8px] border border-line-strong px-3.5 text-[14.5px] font-medium text-ink hover:bg-surface-2"
              >
                <Copy size={15} aria-hidden="true" /> Copy
              </button>
              {canSend && (
                <button
                  type="button"
                  onClick={() => onSendToChat(result.body[0] ?? '')}
                  className="press flex h-10 items-center gap-2 rounded-[8px] bg-brand px-3.5 text-[14.5px] font-medium text-white hover:bg-brand-strong"
                >
                  <Send size={15} aria-hidden="true" /> Send in chat
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {AI_TOOLS.map((option) => {
            const Icon = ICONS[option.icon]
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => setToolId(option.id)}
                  className="press flex w-full items-center gap-4 rounded-[10px] border border-line px-3 py-3 text-left hover:border-brand/40 hover:bg-brand-soft/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] leading-6 font-medium text-ink">
                      {option.title}
                    </span>
                    <span className="block text-[15px] leading-6 text-ink-soft">
                      {option.description}
                    </span>
                  </span>
                  <Icon
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="shrink-0 text-ink-soft"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
