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
import { ACTIVITIES } from '../../../data/classroom'
import { AI_TOOLS, generate } from '../../../lib/classroom/aiTools'
import { copyText } from '../../../lib/classroom/clipboard'
import type { AiToolIcon, AiToolId, Student } from '../../../types/classroom'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

const ICONS: Record<AiToolIcon, LucideIcon> = {
  smile: Smile,
  book: BookOpen,
  heart: Heart,
  compass: Compass,
}

const ACTIVITY_OPTIONS = ACTIVITIES.map((activity) => ({
  value: activity.id,
  label: activity.title,
}))

type AiToolsModalProps = {
  open: boolean
  onClose: () => void
  student: Student
  onSendToChat: (text: string) => void
}

/** "AI teaching tools" (docs/breakdown/09-ai-tools.md). */
export function AiToolsModal({
  open,
  onClose,
  student,
  onSendToChat,
}: AiToolsModalProps) {
  const [toolId, setToolId] = useState<AiToolId | null>(null)
  const [activityId, setActivityId] = useState(ACTIVITIES[0].id)
  const activity = ACTIVITIES.find((a) => a.id === activityId) ?? ACTIVITIES[0]
  const tool = AI_TOOLS.find((t) => t.id === toolId)
  const result = tool ? generate(tool.id, { student, activity }) : null
  const needsActivity = toolId === 'explain' || toolId === 'hint'
  const canSend = toolId === 'encourage' || toolId === 'icebreaker'

  return (
    <Modal open={open} onClose={onClose} width={672} labelledBy="ai-title">
      <div className="flex items-center gap-3 pr-10">
        <span className="bg-brand-soft text-brand grid size-10 shrink-0 place-items-center rounded-full">
          <Zap size={20} strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <h2
            id="ai-title"
            className="text-ink text-[20px] font-semibold leading-7"
          >
            {tool ? tool.title : 'AI teaching tools'}
          </h2>
          <p className="text-ink-soft text-[15px]">
            {student.name} · {student.grade}
          </p>
        </div>
      </div>

      {result ? (
        <div className="mt-6">
          {needsActivity && (
            <div className="mb-5">
              <Select
                label="Activity"
                value={activityId}
                onChange={setActivityId}
                options={ACTIVITY_OPTIONS}
              />
            </div>
          )}
          <div
            className="border-line bg-surface-2/50 rounded-[6px] border px-4 py-4"
            aria-live="polite"
          >
            <h3 className="text-ink text-[15.5px] font-semibold">
              {result.title}
            </h3>
            <ul className="text-ink-soft mt-2 list-disc space-y-2 pl-5 text-[15px] leading-[23px]">
              {result.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <p className="text-muted mt-2 text-[12.5px]">
            Suggestions come from lesson templates, not a live model.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setToolId(null)}
              className="press text-ink-soft hover:text-ink -ml-2 flex h-10 items-center gap-1 rounded-[4px] px-2 text-[15px] font-medium"
            >
              <ChevronLeft size={18} aria-hidden="true" /> All tools
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyText(result.body.join('\n'), 'Copied')}
                className="press border-line-strong text-ink hover:bg-surface-2 flex h-10 items-center gap-2 rounded-[4px] border px-3.5 text-[14.5px] font-medium"
              >
                <Copy size={15} aria-hidden="true" /> Copy
              </button>
              {canSend && (
                <button
                  type="button"
                  onClick={() => onSendToChat(result.body[0] ?? '')}
                  className="press bg-brand hover:bg-brand-strong flex h-10 items-center gap-2 rounded-[4px] px-3.5 text-[14.5px] font-medium text-white"
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
                  className="press border-line hover:border-brand/40 hover:bg-brand-soft/60 flex w-full items-center gap-4 rounded-[6px] border px-3 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block text-[15.5px] font-medium leading-6">
                      {option.title}
                    </span>
                    <span className="text-ink-soft block text-[15px] leading-6">
                      {option.description}
                    </span>
                  </span>
                  <Icon
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="text-ink-soft shrink-0"
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
