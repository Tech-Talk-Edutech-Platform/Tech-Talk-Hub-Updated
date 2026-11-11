import { MessageSquare } from 'lucide-react'

/** The pink tag on the "Student info" row. */
export function SpecialRequirementTag() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-pink-strong px-2.5 py-1 text-[11px] leading-[14px] font-semibold whitespace-nowrap text-white">
      <MessageSquare
        size={10}
        strokeWidth={2.5}
        aria-hidden="true"
        className="shrink-0"
      />
      Special requirement
    </span>
  )
}
