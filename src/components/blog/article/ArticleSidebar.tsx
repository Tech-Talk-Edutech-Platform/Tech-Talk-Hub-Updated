import { ArrowRight, BookOpen, Clock3, List } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { ArticleHeading } from '../../../types/blog'

type ArticleSidebarProps = {
  headings: ArticleHeading[]
  readingTime: number
}

/** Desktop table of contents plus program and booking prompts. */
export function ArticleSidebar({ headings, readingTime }: ArticleSidebarProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-28 space-y-6">
        {headings.length > 0 && (
          <div className="rounded-[1.75rem] border border-purple-100 bg-[#FCFAFF] p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black tracking-[0.14em] text-[#2947C7] uppercase">
              <List size={16} />
              In this article
            </p>
            <nav className="relative mt-5 space-y-1 border-l border-purple-100">
              {headings.map((heading) => (
                <a
                  key={heading.key}
                  href={`#${heading.id}`}
                  className="relative -ml-px block border-l-2 border-transparent py-2 pl-4 text-sm leading-6 text-slate-500 transition hover:border-[#7651EF] hover:text-[#2947C7]"
                >
                  {heading.title}
                </a>
              ))}
            </nav>
            <div className="mt-5 border-t border-purple-100 pt-4">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
                <Clock3 size={14} />
                {readingTime} min read
              </span>
            </div>
          </div>
        )}

        <div className="rounded-[1.75rem] border border-purple-100 bg-gradient-to-br from-[#F7F3FF] to-[#F0E9FF] p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#7651EF] shadow-sm">
            <BookOpen size={19} />
          </span>
          <h3 className="mt-4 text-base leading-snug font-black text-[#2947C7]">
            Discover the right coding program.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Explore learning paths designed for your child’s age.
          </p>
          <Link
            to="/curriculum"
            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#7651EF]"
          >
            View programs
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#2947C7] via-[#594BE1] to-[#7951EF] p-5 text-white shadow-xl shadow-purple-500/15">
          <div className="pointer-events-none absolute -top-7 -right-7 h-24 w-24 rounded-full bg-white/10" />
          <p className="relative text-xs font-black tracking-[0.15em] text-white/70 uppercase">
            Tech Talk Hub
          </p>
          <h3 className="relative mt-3 text-lg leading-snug font-black">
            Help your child start coding.
          </h3>
          <p className="relative mt-3 text-sm leading-6 text-white/75">
            Live, personalized classes for young creators.
          </p>
          <Link
            to="/book"
            className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#2947C7]"
          >
            Book a trial
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </aside>
  )
}
