import { ArrowRight, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ALL_STORIES } from '../../lib/blog'

type EmptyArticlesProps = {
  selectedCategory: string
}

export function EmptyArticles({ selectedCategory }: EmptyArticlesProps) {
  const isFiltered = selectedCategory !== ALL_STORIES

  return (
    <section
      id="latest-stories"
      className="mx-auto max-w-5xl scroll-mt-32 px-6 py-16 sm:py-20"
    >
      <div className="overflow-hidden rounded-[2rem] border border-purple-100 bg-gradient-to-br from-white to-[#FCFAFF] shadow-sm">
        <div className="mx-auto max-w-2xl px-6 py-14 text-center sm:px-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[#F0EBFF] text-[#7651EF]">
            <BookOpen size={29} />
          </span>
          <p className="mt-6 text-xs font-black tracking-[0.16em] text-[#FF3F7F] uppercase">
            {isFiltered ? 'Nothing here yet' : 'Stories coming soon'}
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#2947C7] sm:text-4xl">
            {isFiltered
              ? 'No stories in this category yet.'
              : 'New ideas are being created.'}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-600">
            {isFiltered
              ? 'Explore another category to discover helpful coding guidance and inspiring learner stories.'
              : 'We are preparing practical coding guidance, student stories and technology insights for families raising young creators.'}
          </p>

          {isFiltered ? (
            <Link
              to="/blog#latest-stories"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#7651EF] px-5 py-3 text-sm font-black text-white"
            >
              View all stories
              <ArrowRight size={16} />
            </Link>
          ) : (
            <Link
              to="/book"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#FF3F7F] px-5 py-3 text-sm font-black text-white"
            >
              Explore coding classes
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
