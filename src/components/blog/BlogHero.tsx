import { ArrowRight, BookOpen, Heart, Sparkles } from 'lucide-react'

import { FillImage } from '../ui/FillImage'

type BlogHeroProps = {
  articleCount: number
}

export function BlogHero({ articleCount }: BlogHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-purple-100 bg-gradient-to-br from-white via-[#FCFAFF] to-[#F1EBFF] pt-24 sm:pt-28">
      <div className="pointer-events-none absolute top-10 -left-32 h-80 w-80 rounded-full bg-[#A78BFA]/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-10 -right-24 h-96 w-96 rounded-full bg-[#FF3F7F]/10 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(#2947C7_1px,transparent_1px),linear-gradient(90deg,#2947C7_1px,transparent_1px)] bg-[size:52px_52px] opacity-[0.025]" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 pt-8 pb-10 sm:pt-10 sm:pb-14 lg:min-h-[430px] lg:grid-cols-[0.95fr_1.05fr] lg:gap-8 lg:pt-4 lg:pb-12">
          <div className="relative z-10 mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/90 px-4 py-2 text-[11px] font-black tracking-[0.15em] text-[#7651EF] uppercase shadow-sm">
              <Sparkles size={14} />
              Stories for young creators
            </span>

            <h1 className="mt-6 text-4xl leading-[1.08] font-black tracking-tight text-[#2947C7] sm:text-5xl lg:text-[3.4rem]">
              Ideas for <span className="text-[#FF3F7F]">curious</span> young
              minds.
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-base leading-8 text-slate-600 sm:text-lg lg:mx-0">
              Practical coding guidance, inspiring learner stories and helpful
              resources for parents.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <a
                href="#latest-stories"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF3F7F] px-6 py-3 text-sm font-black text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#E93470]"
              >
                Explore stories
                <ArrowRight size={16} />
              </a>

              {articleCount > 0 && (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <BookOpen size={16} />
                  {articleCount} {articleCount === 1 ? 'article' : 'articles'}
                </span>
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[580px]">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-purple-100/70 via-transparent to-pink-100/70 blur-2xl" />
            <div className="group relative aspect-[16/10] overflow-hidden rounded-[2rem] border border-white/80 bg-[#F4F0FF] shadow-2xl shadow-purple-950/10">
              <FillImage
                src="/blog-hero.png"
                alt="Young learner discovering coding with Tech Talk Hub"
                priority
                sizes="(max-width: 1024px) 100vw, 580px"
                className="object-cover object-center transition duration-700 group-hover:scale-[1.025]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#172554]/30 via-transparent to-transparent" />

              <div className="absolute right-4 bottom-4 left-4 flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-md sm:right-5 sm:bottom-5 sm:left-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-[#FF3F7F]">
                    <Heart size={18} fill="currentColor" />
                  </span>
                  <p className="text-xs leading-5 font-bold text-[#2947C7] sm:text-sm">
                    Every child can become a creator.
                  </p>
                </div>
                <Sparkles className="hidden h-5 w-5 shrink-0 text-[#7651EF] sm:block" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
