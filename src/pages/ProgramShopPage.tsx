import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ProgramShop } from '../components/shop/ProgramShop'
import { PROGRAM_SHOPS } from '../data/programShops'
import type { ProgramSlug } from '../data/programs'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

/** Orbit positions, in the same order as `ProgramShopContent.orbits`. */
const ORBIT_POSITIONS = [
  'absolute -left-6 top-10 rounded-2xl bg-white p-4 shadow-xl',
  'absolute -right-5 bottom-12 rounded-2xl bg-white p-4 shadow-xl',
  'absolute right-3 top-0 rounded-2xl bg-white p-3 shadow-xl',
]

type ProgramShopPageProps = {
  slug: ProgramSlug
}

/** `/junior-coders`, `/future-developers`, `/tech-professionals` — a program's learning resources. */
export function ProgramShopPage({ slug }: ProgramShopPageProps) {
  usePageMeta(staticPageMeta(`/${slug}`))
  const content = PROGRAM_SHOPS[slug]
  const EmblemIcon = content.emblemIcon

  return (
    <main className="min-h-screen bg-white text-[#101936]">
      <section className="relative overflow-hidden border-b border-purple-100">
        <div className={`absolute inset-0 ${content.heroBackgroundClass}`} />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 lg:px-8 lg:py-20">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold tracking-wider text-primary uppercase shadow-sm">
              <Sparkles size={14} />
              {content.badge}
            </span>

            <h1 className="mt-5 text-4xl leading-tight font-black tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              {content.headline}
              <br />
              <span
                className={`${content.highlightGradientClass} bg-clip-text text-transparent`}
              >
                {content.highlight}
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
              {content.description}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={`#${content.productsAnchor}`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20"
              >
                Explore Resources
                <ArrowRight size={16} />
              </a>
              <Link to="/book" className={content.secondaryButtonClass}>
                Book a Free Trial
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-[300px] items-center justify-center md:flex">
            <div
              className={`absolute rounded-full blur-3xl ${content.glowClass}`}
            />
            <div
              className={`relative flex h-[270px] w-[270px] items-center justify-center rounded-full border bg-white shadow-2xl ${content.emblemRingClass}`}
            >
              <div
                className={`flex h-40 w-40 items-center justify-center rounded-[35px] text-white shadow-xl ${content.emblemClass}`}
              >
                <EmblemIcon size={75} />
              </div>

              {content.orbits.map(({ icon: Icon, size, className }, index) => (
                <div
                  key={ORBIT_POSITIONS[index]}
                  className={ORBIT_POSITIONS[index]}
                >
                  <Icon className={className} size={size} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div id={content.productsAnchor}>
        <ProgramShop
          program={content.program}
          title={content.collectionTitle}
          subtitle={content.collectionSubtitle}
          searchPlaceholder={content.searchPlaceholder}
        />
      </div>

      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div
            className={`overflow-hidden rounded-3xl px-7 py-9 text-white md:flex md:items-center md:justify-between md:px-10 ${content.ctaGradientClass}`}
          >
            <div>
              <p className="text-sm font-bold text-white/70">
                {content.ctaEyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-black">{content.ctaTitle}</h2>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                {content.ctaText}
              </p>
            </div>
            <Link
              to="/book"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-primary shadow-lg md:mt-0"
            >
              Book a Free Trial
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
