import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ABOUT_HIGHLIGHTS } from '../../data/home'
import { HoverArrow } from '../ui/HoverArrow'
import { HighlightCard } from './HighlightCard'

/** "Who We Are" summary linking to the About page. */
export function AboutHighlight() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-purple-100 bg-gradient-to-br from-[#F8F5FF] via-white to-[#FFF3F8] px-6 py-12 shadow-sm sm:px-10 lg:px-14 lg:py-14">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-purple-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-pink-300/20 blur-3xl" />

      <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary shadow-sm">
            <Sparkles className="h-4 w-4 text-secondary" />
            Who We Are
          </div>

          <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.8rem]">
            Helping young Africans become{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              creators of technology.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg lg:mx-0">
            Tech Talk Hub is an online education company helping children and
            teenagers build practical coding skills through live, personalized
            and hands-on lessons.
          </p>

          <Link
            to="/about"
            className="group mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-7 py-3.5 font-bold text-white shadow-lg shadow-pink-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-pink-600 hover:shadow-xl"
          >
            Discover Our Story
            <HoverArrow />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {ABOUT_HIGHLIGHTS.map((highlight) => (
            <HighlightCard key={highlight.title} highlight={highlight} />
          ))}
        </div>
      </div>
    </section>
  )
}
