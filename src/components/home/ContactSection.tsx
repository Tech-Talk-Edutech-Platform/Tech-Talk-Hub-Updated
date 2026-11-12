import { Sparkles } from 'lucide-react'

import { ContactForm } from './ContactForm'
import { ContactInfoPanel } from './ContactInfoPanel'

type ContactSectionProps = {
  /** `h1` when the section is the whole page (/contact), `h2` on the home page. */
  headingLevel?: 'h1' | 'h2'
}

export function ContactSection({ headingLevel = 'h2' }: ContactSectionProps) {
  const Heading = headingLevel

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-purple-100 bg-gradient-to-br from-[#F8F5FF] via-white to-[#FFF3F8] px-5 py-10 shadow-sm sm:px-8 sm:py-12 lg:px-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#9B6CFF]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-[#FF3F7F]/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/90 px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#2947C7] uppercase shadow-sm">
            <Sparkles className="h-4 w-4 text-[#FF3F7F]" />
            Talk to Our Team
          </div>

          <Heading className="mt-5 text-3xl font-black tracking-tight text-[#172554] sm:text-4xl lg:text-5xl">
            Let’s start your child’s{' '}
            <span className="text-[#FF3F7F]">coding journey.</span>
          </Heading>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            Have questions about our classes, programs or learning approach? We
            would love to hear from you.
          </p>
        </div>

        <div className="grid overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-purple-900/5 lg:grid-cols-[0.85fr_1.15fr]">
          <ContactInfoPanel />
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
