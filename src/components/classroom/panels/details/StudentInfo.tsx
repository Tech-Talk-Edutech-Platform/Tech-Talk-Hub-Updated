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

/** "Student info": the student card, special requirement and profile facts. */
export function StudentInfo({
  student,
  now,
  onOpenAiTools,
  onGiveBadge,
}: StudentInfoProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)

  const summary = [
    `${student.name} (${student.grade})`,
    `Student ID: ${student.studentId}`,
    `Location: ${student.city}, ${student.country}`,
    `Language: ${student.language}`,
    `Special requirement: ${student.specialRequirement}`,
  ].join('\n')

  const menuItems = [
    {
      label: 'Copy student ID',
      onSelect: () => copyText(student.studentId, 'Student ID copied'),
    },
    { label: 'AI teaching tools', onSelect: onOpenAiTools },
    { label: 'Give a badge', onSelect: onGiveBadge },
  ]

  return (
    <div>
      <div className="flex items-center gap-2.5 rounded-[6px] bg-surface-2 py-2 pr-1 pl-2.5">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-line-strong text-white">
          <User size={18} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] leading-5 font-semibold text-ink">
            {student.name}
          </p>
          <p className="text-[13px] leading-4 text-ink-soft">{student.grade}</p>
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
          className="w-[200px] rounded-[8px] bg-white py-1.5 shadow-[0_12px_32px_-10px_rgb(0_0_0/0.35),0_0_0_1px_rgb(0_0_0/0.05)]"
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

      <div className="mt-2.5 rounded-r-[4px] border-l-[3px] border-callout-edge bg-callout px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
          <MessageSquare size={13} strokeWidth={2} aria-hidden="true" />
          Special requirement
        </p>
        <p className="mt-1 text-[13.5px] leading-[21px] text-ink-soft italic">
          {student.specialRequirement}
        </p>
      </div>

      <ul className="mt-3 space-y-[3px]">
        <StudentInfoRow icon={IdCard} label="Student ID">
          {student.studentId}
        </StudentInfoRow>
        <StudentInfoRow icon={Phone} label="Phone">
          <MaskedValue value={student.phone} label="phone number" />
        </StudentInfoRow>
        <StudentInfoRow icon={Mail} label="Email">
          <MaskedValue value={student.email} label="email" />
        </StudentInfoRow>
        <StudentInfoRow icon={Globe} label="Country">
          {student.country}
        </StudentInfoRow>
        <StudentInfoRow icon={MapPin} label="City">
          {student.city}
        </StudentInfoRow>
        <StudentInfoRow icon={Languages} label="Language spoken">
          {student.language}
        </StudentInfoRow>
        <StudentInfoRow icon={Clock} label="Current time">
          <span className="tabular-nums">
            {formatStudentTime(now, student.timeZone)}
          </span>
        </StudentInfoRow>
        <StudentInfoRow icon={Link} label="Source">
          <span className="break-all">{student.source}</span>
        </StudentInfoRow>
      </ul>
    </div>
  )
}
