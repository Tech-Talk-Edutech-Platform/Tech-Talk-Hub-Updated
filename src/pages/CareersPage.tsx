import { ArrowRight, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

import { InformationPageLayout } from '../components/info/InformationPageLayout'
import {
  CAREER_APPLICATION_HREF,
  CAREER_AREAS,
  CAREER_VALUES,
} from '../data/careers'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

export function CareersPage() {
  usePageMeta(staticPageMeta('/careers'))

  return (
    <InformationPageLayout
      badge="Careers at Tech Talk Hub"
      title="Help shape Africa’s"
      highlightedText="young creators."
      description="Join a growing education company helping children discover coding, confidence and creative problem-solving."
    >
      <div className="rounded-[2rem] border border-purple-100 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs font-bold tracking-[0.14em] text-[#FF3F7F] uppercase">
          Work With Purpose
        </p>
        <h2 className="mt-3 text-2xl font-black text-[#172554] sm:text-3xl">
          Build something that matters.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          Tech Talk Hub works with educators, technology professionals and
          creative people who believe African children deserve practical
          opportunities to learn, build and grow.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          Whether you teach coding, build learning materials or connect with
          families, your work can help make technology education more
          accessible.
        </p>
      </div>

      <div className="mt-12">
        <div className="mb-7">
          <p className="text-xs font-bold tracking-[0.14em] text-[#FF3F7F] uppercase">
            Ways to Contribute
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#2947C7] sm:text-3xl">
            Areas we work in
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            These are the types of roles that support our mission. Available
            opportunities may vary.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {CAREER_AREAS.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-[#2947C7]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-[#172554]">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-12 rounded-[2rem] border border-purple-100 bg-gradient-to-br from-white to-[#F7F2FF] p-7 sm:p-9">
        <p className="text-xs font-bold tracking-[0.14em] text-[#FF3F7F] uppercase">
          What Matters to Us
        </p>
        <h2 className="mt-3 text-2xl font-black text-[#172554] sm:text-3xl">
          Our working values
        </h2>

        <div className="mt-7 grid gap-6 md:grid-cols-3">
          {CAREER_VALUES.map(({ icon: Icon, title, description }) => (
            <div key={title}>
              <Icon className="h-5 w-5 text-[#2947C7]" />
              <h3 className="mt-3 font-bold text-[#172554]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 rounded-[2rem] border border-purple-100 bg-white p-7 text-center shadow-sm sm:p-10">
        <Mail className="mx-auto h-8 w-8 text-[#FF3F7F]" />
        <h2 className="mt-4 text-2xl font-black text-[#172554]">
          Interested in working with us?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          Send us your CV and a short introduction explaining the area you are
          interested in and how you would like to contribute.
        </p>
        <a
          href={CAREER_APPLICATION_HREF}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FF3F7F] px-6 py-3 font-bold text-white transition hover:bg-[#E93470]"
        >
          Send Your Application
          <ArrowRight className="h-4 w-4" />
        </a>
        <p className="mt-5 text-xs text-slate-500">
          Looking for a coding program instead?{' '}
          <Link to="/book" className="font-semibold text-[#2947C7]">
            Book a free trial.
          </Link>
        </p>
      </div>
    </InformationPageLayout>
  )
}
