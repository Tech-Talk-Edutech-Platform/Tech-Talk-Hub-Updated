import type { ReactNode } from 'react'

type SectionEmptyProps = {
  action?: { label: string; onClick: () => void }
  children: ReactNode
}

/** The small empty state used inside accordion sections. */
export function SectionEmpty({ action, children }: SectionEmptyProps) {
  return (
    <div className="rounded-[10px] border border-dashed border-line-strong px-3 py-3 text-[13.5px] leading-5 text-muted">
      {children}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="press ml-1 font-medium text-brand underline-offset-2 hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
