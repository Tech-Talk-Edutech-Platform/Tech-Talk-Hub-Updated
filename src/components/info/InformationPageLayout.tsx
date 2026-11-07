import type { ReactNode } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Footer } from '../layout/Footer'
import { NavBar } from '../layout/NavBar'

type InformationPageLayoutProps = {
  badge: string
  title: string
  highlightedText?: string
  description?: string
  children: ReactNode
}

/** Shell for the careers and policy pages: hero, content column and a contact call to action. */
export function InformationPageLayout({
  badge,
  title,
  highlightedText,
  description,
  children,
}: InformationPageLayoutProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FBFAFF] text-[#172554]">
      <NavBar />

      <section className="relative overflow-hidden border-b border-purple-100 bg-gradient-to-br from-white via-[#FBF9FF] to-[#F0E8FF] pt-20">
        <div className="pointer-events-none absolute top-0 -left-24 h-72 w-72 rounded-full bg-[#9B6CFF]/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#FF3F7F]/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center sm:py-20 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/90 px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#2947C7] uppercase shadow-sm">
            <Sparkles className="h-4 w-4 text-[#FF3F7F]" />
            {badge}
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-tight text-[#172554] sm:text-5xl lg:text-6xl">
            {title}{' '}
            {highlightedText && (
              <span className="text-[#FF3F7F]">{highlightedText}</span>
            )}
          </h1>

          {description && (
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {description}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-16 lg:px-8">
        {children}
      </section>

      <section className="px-6 pb-16 lg:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#2947C7] px-7 py-10 text-white shadow-xl shadow-blue-950/10 sm:px-10">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#FF3F7F]/25 blur-3xl" />

          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black sm:text-2xl">
                Have a question?
              </h2>
              <p className="mt-2 text-sm leading-6 text-blue-100">
                Our team is available to help you.
              </p>
            </div>

            <Link
              to="/#contact"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF3F7F] px-6 py-3 font-bold text-white transition hover:bg-[#E93470]"
            >
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
