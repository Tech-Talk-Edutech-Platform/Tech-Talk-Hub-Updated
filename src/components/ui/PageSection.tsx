import type { ReactNode } from 'react'

type PageSectionProps = {
  id?: string
  /** Background and vertical padding for the full-width band. */
  className: string
  children: ReactNode
}

/** A full-width page band with the standard centred content container. */
export function PageSection({ id, className, children }: PageSectionProps) {
  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-7xl px-6">{children}</div>
    </section>
  )
}
