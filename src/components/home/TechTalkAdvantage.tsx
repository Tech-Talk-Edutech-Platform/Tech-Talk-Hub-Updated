import { PLATFORM_ADVANTAGES } from '../../data/home'
import { AdvantageCard } from './AdvantageCard'

/** "The Tech Talk Advantage" feature grid. */
export function TechTalkAdvantage() {
  return (
    <section className="border-t border-slate-100 bg-white px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold tracking-[0.15em] text-secondary uppercase">
            Why Tech Talk Hub
          </span>

          <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
            The Tech Talk Advantage
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Learning tools designed to keep every child supported, motivated and
            progressing.
          </p>

          <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-secondary" />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLATFORM_ADVANTAGES.map((feature) => (
            <AdvantageCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  )
}
