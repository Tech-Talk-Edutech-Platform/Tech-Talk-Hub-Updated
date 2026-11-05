import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type StudentInfoRowProps = {
  icon: LucideIcon
  label: string
  children: ReactNode
}

/** One "Label: value" fact in the student profile. */
export function StudentInfoRow({
  icon: Icon,
  label,
  children,
}: StudentInfoRowProps) {
  return (
    <li className="text-ink-soft flex gap-2.5 text-[13.5px] leading-[22px]">
      <Icon
        size={14}
        strokeWidth={1.8}
        aria-hidden="true"
        className="text-muted mt-[4px] shrink-0"
      />
      <span className="min-w-0">
        {label}: <span className="text-ink">{children}</span>
      </span>
    </li>
  )
}
