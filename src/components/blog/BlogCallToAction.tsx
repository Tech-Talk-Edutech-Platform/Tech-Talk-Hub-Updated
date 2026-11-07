import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CtaPoints } from './CtaPoints'

export function BlogCallToAction() {
  return (
    <section className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2947C7] via-[#594BE1] to-[#7951EF] px-7 py-10 text-white shadow-2xl shadow-purple-950/15 sm:px-12 sm:py-12">
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-0 -bottom-28 h-72 w-72 rounded-full bg-pink-300/20 blur-2xl" />

        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-black tracking-[0.14em] text-white uppercase">
              <Sparkles size={13} />
              Start their journey
            </span>
            <h2 className="mt-5 text-3xl leading-tight font-black sm:text-4xl">
              Ready to help your child start coding?
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              Explore personalized coding classes designed around your child’s
              age, interests and learning pace.
            </p>
            <CtaPoints />
          </div>

          <Link
            to="/book"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#FF6B63] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#FF5951]"
          >
            Book a trial class
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  )
}
