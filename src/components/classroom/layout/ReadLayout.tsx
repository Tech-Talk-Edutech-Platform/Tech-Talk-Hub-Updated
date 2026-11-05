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
      <header className="border-line flex h-12 items-center gap-3 border-b px-4">
        <BrandMark size={28} />
        <span className="text-ink text-[15px] font-semibold">
          {CLASSROOM_BRAND.name}
        </span>
      </header>
      <main className="mx-auto max-w-[760px] px-4 pb-24 pt-10 sm:px-6">
        <h1 className="text-ink text-[28px] font-semibold leading-9 tracking-[-0.01em]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-ink-soft mt-1.5 text-[16px]">{subtitle}</p>
        )}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  )
}
