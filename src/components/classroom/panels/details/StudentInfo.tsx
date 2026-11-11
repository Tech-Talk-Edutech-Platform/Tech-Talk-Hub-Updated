import { useRef, useState } from 'react'
import {
  Clock,
  Copy,
  EllipsisVertical,
  Globe,
  IdCard,
  Languages,
  Link,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  User,
} from 'lucide-react'
import { copyText } from '../../../../lib/classroom/clipboard'
import { formatStudentTime } from '../../../../lib/classroom/time'
import type { Student } from '../../../../types/classroom'
import { Popover } from '../../ui/Popover'
import { MaskedValue } from './MaskedValue'
import { StudentInfoRow } from './StudentInfoRow'

type StudentInfoProps = {
  student: Student
  now: number
  onOpenAiTools: () => void
  onGiveBadge: () => void
}

/**
 * "Student info": the student card, special requirement and profile facts.
 * Rows the booking doesn't have are left out rather than shown blank.
 */
export function StudentInfo({
  student,
  now,
  onOpenAiTools,
  onGiveBadge,
}: StudentInfoProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)

  const location = [student.city, student.country].filter(Boolean).join(', ')
  const summary = [
    student.grade ? `${student.name} (${student.grade})` : student.name,
    student.studentId && `Student ID: ${student.studentId}`,
    location && `Location: ${location}`,
    student.language && `Language: ${student.language}`,
    student.specialRequirement &&
      `Special requirement: ${student.specialRequirement}`,
  ]
    .filter(Boolean)
    .join('\n')

  const menuItems = [
    ...(student.studentId
      ? [
          {
            label: 'Copy student ID',
            onSelect: () => copyText(student.studentId, 'Student ID copied'),
          },
        ]
      : []),
    { label: 'AI teaching tools', onSelect: onOpenAiTools },
    { label: 'Give a badge', onSelect: onGiveBadge },
  ]

  return (
    <div>
      <div className="flex items-center gap-2.5 rounded-[10px] bg-surface-2 py-2 pr-1 pl-2.5">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
          <User size={17} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] leading-5 font-semibold text-ink">
            {student.name}
          </p>
          {student.grade && (
            <p className="text-[13px] leading-4 text-ink-soft">
              {student.grade}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => copyText(summary, 'Student details copied')}
          aria-label="Copy student details"
          title="Copy student details"
          className="press grid size-8 place-items-center rounded-md text-brand hover:bg-white"
        >
          <Copy size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          ref={menuRef}
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="More student actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="press grid size-8 place-items-center rounded-md text-ink-soft hover:bg-white"
        >
          <EllipsisVertical size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <Popover
          anchorRef={menuRef}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          align="end"
          gap={6}
          role="menu"
          label="Student actions"
          className="w-[200px] rounded-[10px] bg-white py-1.5 shadow-[0_12px_32px_-10px_rgb(15_23_42/0.35),0_0_0_1px_rgb(15_23_42/0.05)]"
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                item.onSelect()
              }}
              className="press flex h-9 w-full items-center px-3.5 text-left text-[14px] text-ink hover:bg-surface-2"
            >
              {item.label}
            </button>
          ))}
        </Popover>
      </div>

      {student.specialRequirement && (
        <div className="mt-2.5 rounded-r-[8px] border-l-[3px] border-callout-edge bg-callout px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
            <MessageSquare size={13} strokeWidth={2} aria-hidden="true" />
            Special requirement
          </p>
          <p className="mt-1 text-[13.5px] leading-[21px] text-ink-soft italic">
            {student.specialRequirement}
          </p>
        </div>
      )}

      <ul className="mt-3 space-y-[3px]">
        {student.studentId && (
          <StudentInfoRow icon={IdCard} label="Student ID">
            {student.studentId}
          </StudentInfoRow>
        )}
        {student.phone && (
          <StudentInfoRow icon={Phone} label="Phone">
            <MaskedValue value={student.phone} label="phone number" />
          </StudentInfoRow>
        )}
        {student.email && (
          <StudentInfoRow icon={Mail} label="Email">
            <MaskedValue value={student.email} label="email" />
          </StudentInfoRow>
        )}
        {student.country && (
          <StudentInfoRow icon={Globe} label="Country">
            {student.country}
          </StudentInfoRow>
        )}
        {student.city && (
          <StudentInfoRow icon={MapPin} label="City">
            {student.city}
          </StudentInfoRow>
        )}
        {student.language && (
          <StudentInfoRow icon={Languages} label="Language spoken">
            {student.language}
          </StudentInfoRow>
        )}
        <StudentInfoRow icon={Clock} label="Current time">
          <span className="tabular-nums">
            {formatStudentTime(now, student.timeZone)}
          </span>
        </StudentInfoRow>
        {student.source && (
          <StudentInfoRow icon={Link} label="Source">
            <span className="break-all">{student.source}</span>
          </StudentInfoRow>
        )}
      </ul>
    </div>
  )
}
