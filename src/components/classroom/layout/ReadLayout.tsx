import type { ReactNode } from 'react'
import { CLASSROOM_BRAND } from '../../../data/classroomBrand'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { BrandMark } from '../brand/BrandMark'

type ReadLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Plain reading page for content opened "in a new tab" from the classroom. */
export function ReadLayout({ title, subtitle, children }: ReadLayoutProps) {
  useDocumentTitle(`${title} | ${CLASSROOM_BRAND.name}`)

  return (
    <div className="min-h-dvh bg-white">
      <header className="flex h-12 items-center gap-3 border-b border-line px-4">
        <BrandMark size={28} />
        <span className="text-[15px] font-semibold text-ink">
          {CLASSROOM_BRAND.name}
        </span>
      </header>
      <main className="mx-auto max-w-[760px] px-4 pt-10 pb-24 sm:px-6">
        <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[16px] text-ink-soft">{subtitle}</p>
        )}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  )
}
