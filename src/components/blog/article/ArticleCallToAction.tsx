import { ArrowRight, Code2, Gamepad2, Rocket, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { ArticleImageData } from '../../../types/blog'
import { CtaPoints } from '../CtaPoints'

type ArticleCallToActionProps = {
  /** The article's last image, shown in the circle; a rocket when there is none. */
  image?: ArticleImageData
}

export function ArticleCallToAction({ image }: ArticleCallToActionProps) {
  return (
    <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#7758F2] via-[#7053EE] to-[#A584F8] shadow-2xl shadow-purple-500/20">
      <div className="pointer-events-none absolute -top-14 -right-14 h-48 w-48 rounded-full bg-white/10" />

      <div className="grid items-center gap-7 p-7 sm:p-9 md:grid-cols-[1fr_190px]">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black tracking-[0.12em] text-white uppercase">
            <Sparkles size={13} />
            Start their journey
          </p>
          <h2 className="mt-5 max-w-lg text-2xl leading-tight font-black text-white sm:text-3xl">
            Ready to help your child start coding?
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-7 text-white/85 sm:text-base">
            Discover personalized classes that help young learners build, create
            and grow with technology.
          </p>
          <CtaPoints />
          <Link
            to="/book"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FF6B63] px-5 py-3 text-sm font-black text-white transition hover:bg-[#FF5951]"
          >
            Book a trial class
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="relative hidden h-44 items-center justify-center md:flex">
          <div className="absolute inset-0 rounded-full bg-white/10" />
          {image?.src ? (
            <div className="relative h-36 w-36 overflow-hidden rounded-full border-4 border-white/30 bg-white shadow-lg">
              <img
                src={image.src}
                alt={image.alt || 'Tech Talk Hub learner'}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white">
              <Rocket size={55} />
            </div>
          )}
          <span className="absolute top-3 left-1 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
            <Code2 size={19} />
          </span>
          <span className="absolute right-0 bottom-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
            <Gamepad2 size={19} />
          </span>
        </div>
      </div>
    </section>
  )
}
