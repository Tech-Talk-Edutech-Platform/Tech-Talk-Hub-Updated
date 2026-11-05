import { useId, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

type AccordionSectionProps = {
  title: string
  open: boolean
  onToggle: () => void
  /** Shown between the title and the chevron (e.g. a tag). */
  aside?: ReactNode
  children: ReactNode
}

/** One row of the Class details accordion: 15px semibold label, chevron that turns down. */
export function AccordionSection({
  title,
  open,
  onToggle,
  aside,
  children,
}: AccordionSectionProps) {
  const id = useId()
  return (
    <section className="border-line border-b">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="group flex min-h-[49px] w-full items-center gap-2 py-2 text-left"
        >
          <span className="text-ink group-hover:text-brand flex min-w-0 flex-1 items-center gap-2 text-[15px] font-semibold leading-6 transition-colors duration-150">
            {title}
          </span>
          {aside}
          <ChevronRight
            size={19}
            strokeWidth={2}
            aria-hidden="true"
            className={`text-ink-soft shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-90' : ''}`}
          />
        </button>
      </h3>
      {open && (
        <div id={id} className="panel-in pb-5">
          {children}
        </div>
      )}
    </section>
  )
}
