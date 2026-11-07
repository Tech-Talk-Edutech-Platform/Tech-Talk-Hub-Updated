import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { usePublicProgram } from '../../hooks/usePublicProgram'
import { CourseAccordionItem } from './CourseAccordionItem'
import { JourneyItem } from './JourneyItem'

const PROGRAM_PROMISES = [
  'Expert-led learning',
  'Hands-on projects',
  'Personalized progress',
]

type PublicProgramPageProps = {
  slug: string
}

/** A program's overview and the courses inside it, loaded from Supabase. */
export function PublicProgramPage({ slug }: PublicProgramPageProps) {
  const query = usePublicProgram(slug)
  // `undefined` = the visitor hasn't toggled anything yet, so the first course is open.
  const [openCourseId, setOpenCourseId] = useState<string | null>()

  if (query.isPending) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!query.data) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <h1 className="text-3xl font-black text-slate-900">
          Program not found
        </h1>
        <Link to="/" className="mt-5 font-semibold text-primary">
          Return Home →
        </Link>
      </div>
    )
  }

  const { program, courses } = query.data
  const openId =
    openCourseId === undefined ? (courses[0]?.id ?? null) : openCourseId

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/40 to-purple-100/60 pt-28">
        <div className="pointer-events-none absolute top-10 -right-32 h-[420px] w-[420px] rounded-full bg-purple-300/20 blur-[110px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.12em] text-primary uppercase shadow-sm">
              <Sparkles size={14} />
              {program.age_range}
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]">
              {program.name}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              {program.description}
            </p>

            <div className="mt-7 flex flex-wrap gap-5 text-sm font-semibold text-slate-600">
              {PROGRAM_PROMISES.map((promise) => (
                <span key={promise} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary" />
                  {promise}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 rounded-xl bg-secondary px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-secondary/20 transition hover:-translate-y-0.5"
              >
                Book a Free Trial
                <ArrowRight size={16} />
              </Link>
              <a
                href="#curriculum"
                className="rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-purple-50"
              >
                Explore Curriculum
              </a>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-lg items-center justify-center">
            <div className="absolute h-[300px] w-[300px] rounded-full bg-purple-300/20 blur-[80px]" />
            <div className="relative flex min-h-[300px] w-full flex-col justify-center rounded-[32px] border border-white/80 bg-white/75 p-8 shadow-2xl shadow-purple-900/10 backdrop-blur-xl">
              <p className="text-xs font-bold tracking-[0.14em] text-secondary uppercase">
                Learning Journey
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">
                Learn → Build → Create
              </h2>
              <div className="mt-6 space-y-4">
                <JourneyItem number="01" text="Build strong foundations" />
                <JourneyItem number="02" text="Practice through projects" />
                <JourneyItem number="03" text="Progress to real-world skills" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="curriculum"
        className="scroll-mt-24 bg-slate-50 py-16 md:py-20"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-xs font-bold tracking-[0.15em] text-secondary uppercase">
              Curriculum
            </span>
            <h2 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
              Courses Inside This Program
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Explore the courses and learning phases your child can progress
              through. Full lesson content is available to enrolled learners.
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-4 font-bold text-slate-700">
                Curriculum coming soon
              </h3>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <CourseAccordionItem
                  key={course.id}
                  course={course}
                  isOpen={openId === course.id}
                  onToggle={() =>
                    setOpenCourseId(openId === course.id ? null : course.id)
                  }
                />
              ))}
            </div>
          )}

          <div className="mt-10 rounded-3xl border border-purple-100 bg-purple-50/60 p-6 text-center">
            <p className="font-bold text-slate-900">
              Lessons, projects, quizzes and learning resources are available
              inside the student dashboard.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Start with a free trial to find the right learning path.
            </p>
            <Link
              to="/book"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
            >
              Book a Free Trial
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
