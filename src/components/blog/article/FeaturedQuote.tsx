import type { ReactNode } from 'react'
import { Quote } from 'lucide-react'

type FeaturedQuoteProps = {
  children: ReactNode
}

/** How markdown blockquotes render in articles. */
export function FeaturedQuote({ children }: FeaturedQuoteProps) {
  return (
    <blockquote className="relative my-10 overflow-hidden rounded-[1.75rem] border border-purple-100 bg-gradient-to-r from-[#F5F1FF] via-[#F8F5FF] to-[#FFF4F7] px-6 py-7 sm:px-9">
      <Quote className="absolute top-5 right-5 h-12 w-12 text-purple-200/70" />
      <div className="relative flex items-start gap-4">
        <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7853EE]">
          <Quote size={19} />
        </span>
        <div className="text-base leading-8 font-bold text-[#5845C9] italic sm:text-lg [&_p]:my-0 [&_p]:text-[#5845C9]">
          {children}
        </div>
      </div>
      <p className="mt-4 ml-14 text-xs font-semibold tracking-[0.12em] text-purple-400 uppercase">
        Tech Talk Hub
      </p>
    </blockquote>
  )
}
