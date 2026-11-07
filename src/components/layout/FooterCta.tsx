import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { HoverArrow } from '../ui/HoverArrow'

/** "Book a free trial" banner at the top of the footer. */
export function FooterCta() {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-r from-[#2947C7] to-[#7252D3] px-6 py-8 shadow-xl shadow-blue-950/20 sm:px-9 lg:px-10">
      <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-[#FF3F7F]/25 blur-3xl" />

      <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-pink-200 uppercase">
            <Sparkles className="h-4 w-4" />
            Start Their Coding Journey
          </div>

          <h2 className="mt-3 text-2xl leading-tight font-black sm:text-3xl">
            Help your child create with technology.
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
            Book a free trial and discover the right learning path for your
            young creator.
          </p>
        </div>

        <Link
          to="/book"
          className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF3F7F] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-950/20 transition-all hover:-translate-y-0.5 hover:bg-[#E93470]"
        >
          Book a Free Trial
          <HoverArrow />
        </Link>
      </div>
    </div>
  )
}
