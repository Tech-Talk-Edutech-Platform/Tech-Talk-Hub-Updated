import type { ReactNode } from 'react'

type SectionEmptyProps = {
  action?: { label: string; onClick: () => void }
  children: ReactNode
}

/** The small empty state used inside accordion sections. */
export function SectionEmpty({ action, children }: SectionEmptyProps) {
  return (
    <div className="border-line-strong text-muted rounded-[6px] border border-dashed px-3 py-3 text-[13.5px] leading-5">
      {children}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="press text-brand ml-1 font-medium underline-offset-2 hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
