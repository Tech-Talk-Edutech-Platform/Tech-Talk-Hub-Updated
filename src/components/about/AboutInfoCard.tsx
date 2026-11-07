import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ABOUT_CARD_ICONS } from '../../data/about'
import type { AboutSection } from '../../types/about'

type AboutInfoCardProps = {
  item: AboutSection
  index: number
}

export function AboutInfoCard({ item, index }: AboutInfoCardProps) {
  const Icon = ABOUT_CARD_ICONS[index % ABOUT_CARD_ICONS.length]
  const showButton = item.title?.trim().toLowerCase() === 'what we offer'

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-purple-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#9B6CFF]/40 hover:shadow-xl sm:p-9">
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#9B6CFF]/10 blur-2xl transition-colors group-hover:bg-[#FF3F7F]/10" />

      <div className="relative">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2947C7] to-[#9B6CFF] text-white shadow-lg shadow-[#2947C7]/20">
          <Icon size={23} />
        </div>

        {item.title && (
          <p className="mb-3 text-xs font-extrabold tracking-[0.2em] text-[#FF3F7F] uppercase">
            {item.title}
          </p>
        )}

        {item.headline && (
          <h2 className="mb-4 text-2xl leading-tight font-black text-[#172554] sm:text-3xl">
            {item.headline}
          </h2>
        )}

        {item.text && (
          <p className="text-base leading-8 whitespace-pre-line text-slate-600">
            {item.text}
          </p>
        )}

        {showButton && (
          <Link
            to="/curriculum"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#2947C7] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#FF3F7F]"
          >
            View Our Curriculum
            <ArrowRight size={17} />
          </Link>
        )}
      </div>
    </article>
  )
}
