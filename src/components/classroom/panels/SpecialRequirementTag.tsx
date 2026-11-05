import { MessageSquare } from 'lucide-react'

/** The orange tag on the "Student info" row. */
export function SpecialRequirementTag() {
  return (
    <span className="bg-brand flex w-[130px] shrink-0 items-center gap-1.5 rounded-[4px] px-2 py-[5px] text-[11px] font-semibold leading-[11px] text-white">
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
