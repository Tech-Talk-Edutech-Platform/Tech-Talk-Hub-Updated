import { CheckCircle2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { HERO_BENEFITS } from '../../data/home'
import { HoverArrow } from '../ui/HoverArrow'

/** Hero headline, benefits and calls to action. */
export function HeroContent() {
  return (
    <div className="relative z-20 mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/90 px-4 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur-sm">
        <Sparkles className="h-4 w-4 text-secondary" />
        <span>Live Coding Classes for Kids</span>
      </div>

      <h1 className="text-[2.6rem] leading-[1.08] font-extrabold tracking-[-0.045em] text-primary sm:text-5xl lg:text-[3.2rem] xl:text-[3.65rem]">
        Turning Young Minds Into{' '}
        <span className="text-secondary">Creators.</span>
      </h1>

      <p className="mx-auto mt-4 max-w-[31rem] text-[15px] leading-7 text-slate-600 sm:text-base lg:mx-0">
        Expert-led coding classes for kids aged{' '}
        <span className="font-semibold text-primary">5–17</span> — building
        skills, confidence and creativity.
      </p>

      <div className="mx-auto mt-5 grid max-w-md gap-2.5 text-left lg:mx-0">
        {HERO_BENEFITS.map((benefit) => (
          <div key={benefit} className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            </span>

            <span className="text-sm leading-5 font-medium text-slate-700 sm:text-[15px]">
              {benefit}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
        <Link
          to="/book"
          className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-6 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-pink-600 hover:shadow-xl sm:w-auto"
        >
          Book a Free Trial
          <HoverArrow />
        </Link>

        <Link
          to="/courses"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-6 text-sm font-semibold text-primary shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white hover:shadow-md sm:w-auto"
        >
          Explore Courses
        </Link>
      </div>

      <p className="mt-4 text-xs font-medium text-slate-500 sm:text-sm">
        <span className="text-primary">✓</span> No commitment required
        <span className="mx-2 text-slate-300">•</span>
        Free first class
      </p>
    </div>
  )
}
