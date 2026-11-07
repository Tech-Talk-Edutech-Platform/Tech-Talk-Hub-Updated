import { Heart } from 'lucide-react'

import { FillImage } from '../ui/FillImage'

export function FounderNote() {
  return (
    <section className="border-t border-purple-50 bg-[#FCFAFF] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-purple-100 bg-white p-7 shadow-sm sm:p-10">
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-purple-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-52 w-52 rounded-full bg-pink-100/50 blur-3xl" />

          <div className="relative grid items-center gap-8 md:grid-cols-[150px_1fr]">
            <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-[1.75rem] border-4 border-white bg-purple-100 shadow-xl md:mx-0">
              {/* founder.jpg isn't in the repo yet (it was missing on the old site too). */}
              <FillImage
                src="/founder.jpg"
                alt="Justin Akinyi, founder of Tech Talk Hub"
                sizes="150px"
                className="object-cover"
              />
            </div>

            <div className="text-center md:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-[11px] font-black tracking-[0.14em] text-[#FF3F7F] uppercase">
                <Heart size={13} fill="currentColor" />A note from our founder
              </span>
              <h2 className="mt-4 text-2xl leading-tight font-black text-[#2947C7] sm:text-3xl">
                Every child deserves the opportunity to create.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                Technology should be more than something children consume. It
                should become a tool they use to express ideas, solve problems
                and build confidently.
              </p>
              <p className="mt-5 text-sm font-black text-[#2947C7]">
                — Justin Akinyi, Founder
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
