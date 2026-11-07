import { ArrowRight, Globe2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AboutInfoCard } from '../components/about/AboutInfoCard'
import { NavBar } from '../components/layout/NavBar'
import { FillImage } from '../components/ui/FillImage'
import { SERVED_COUNTRIES } from '../data/about'
import { staticPageMeta } from '../data/seo'
import { useAboutSections } from '../hooks/useAboutSections'
import { usePageMeta } from '../hooks/usePageMeta'

export function AboutPage() {
  usePageMeta(staticPageMeta('/about'))
  const sections = useAboutSections()

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FBFAFF] text-[#172554]">
      <NavBar />

      <section className="relative min-h-[650px] overflow-hidden sm:min-h-[720px]">
        <FillImage
          src="/classroom.png"
          alt="African children learning coding and robotics at Tech Talk Hub"
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#172554]/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#172554]/80 via-[#172554]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#172554]/45 via-transparent to-transparent" />

        <div className="relative mx-auto flex min-h-[650px] max-w-7xl items-center px-6 pt-32 pb-20 sm:min-h-[720px] lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold tracking-[0.18em] text-white uppercase shadow-sm backdrop-blur-md">
              <Sparkles size={15} className="text-[#FF3F7F]" />
              <span>Building Africa’s future creators</span>
            </div>

            <h1 className="max-w-3xl text-4xl leading-[1.08] font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              Young minds can build{' '}
              <span className="text-[#FF8BB2]">extraordinary things.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-100 sm:text-xl">
              Tech Talk Hub gives children practical coding skills, confidence,
              and creativity through engaging, personalized online learning.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FF3F7F] px-7 py-4 font-bold text-white shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-[#E93470]"
              >
                Book a Class
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/curriculum"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-7 py-4 font-bold text-white backdrop-blur-md transition-all hover:bg-white hover:text-[#2947C7]"
              >
                Explore Our Programs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-6 lg:px-8">
        <div className="grid gap-7 rounded-3xl border border-purple-100 bg-white p-7 shadow-xl shadow-purple-900/5 sm:p-10 md:grid-cols-[0.8fr_2fr]">
          <div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-[#FF3F7F] uppercase">
              Who we are
            </p>
            <h2 className="mt-3 text-3xl leading-tight font-black text-[#2947C7]">
              More than coding classes
            </h2>
          </div>
          <p className="text-base leading-8 text-slate-600 sm:text-lg">
            We are an African edtech organization helping children move from
            simply using technology to understanding, creating, and building
            with it. Our programs make digital skills practical, exciting, and
            suitable for every learner’s age.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-extrabold tracking-[0.2em] text-[#FF3F7F] uppercase">
            The Tech Talk Hub difference
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#2947C7] sm:text-5xl">
            Learning designed to inspire
          </h2>
          <p className="mt-5 leading-7 text-slate-600">
            We combine personalized teaching, practical projects, and
            age-appropriate technology education.
          </p>
        </div>

        {sections.status === 'loading' ? (
          <div className="min-h-64" aria-busy="true" />
        ) : sections.status === 'success' && sections.data.length > 0 ? (
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {sections.data.map((item, index) => (
              <AboutInfoCard key={item.id} item={item} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-purple-200 bg-white p-12 text-center text-slate-500">
            About-page content is being updated.
          </div>
        )}
      </section>

      <section className="border-y border-purple-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#9B6CFF]/10 text-[#2947C7]">
            <Globe2 size={27} />
          </div>
          <h2 className="mt-6 text-3xl font-black text-[#2947C7] sm:text-4xl">
            Serving students across Africa
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
            Our online classes connect young learners with practical technology
            education wherever they are.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {SERVED_COUNTRIES.map((country) => (
              <div
                key={country.name}
                className="rounded-full border border-purple-100 bg-[#FBFAFF] px-5 py-3 text-sm font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-[#9B6CFF]/50 hover:bg-[#9B6CFF]/5"
              >
                <span className="mr-2" aria-hidden="true">
                  {country.flag}
                </span>
                {country.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#2947C7] px-7 py-16 text-center text-white shadow-2xl shadow-blue-950/15 sm:px-12 sm:py-20">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#9B6CFF]/30 blur-3xl" />
          <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-[#FF3F7F]/25 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-extrabold tracking-[0.2em] text-pink-200 uppercase">
              Start their technology journey
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl leading-tight font-black sm:text-5xl">
              Give your child the skills to create the future.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl leading-7 text-blue-100">
              Choose an age-appropriate program and let your child learn coding
              through guided, hands-on projects.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FF3F7F] px-8 py-4 font-bold text-white shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-[#E93470]"
              >
                Join Our Next Class
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/curriculum"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-8 py-4 font-bold text-white transition-all hover:bg-white hover:text-[#2947C7]"
              >
                View Curriculum
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
