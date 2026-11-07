import { BookOpen, ChevronDown } from 'lucide-react'

import type { ProgramCourse } from '../../types/program'

type CourseAccordionItemProps = {
  course: ProgramCourse
  isOpen: boolean
  onToggle: () => void
}

/** A course row that expands to show its learning phases. */
export function CourseAccordionItem({
  course,
  isOpen,
  onToggle,
}: CourseAccordionItemProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-5 p-5 text-left sm:p-6"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-purple-50">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <BookOpen size={22} className="text-primary" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wider text-secondary uppercase">
            Course
          </p>
          <h3 className="mt-1 text-xl font-extrabold text-slate-900">
            {course.title}
          </h3>
          {course.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {course.description}
            </p>
          )}
        </div>

        <ChevronDown
          size={20}
          className={`shrink-0 text-slate-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-6">
          {course.phases.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {course.phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xs font-black text-primary">
                      {String(phase.phase_number || index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">
                        {phase.title}
                      </h4>
                      {phase.focus && (
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {phase.focus}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Phases coming soon.</p>
          )}
        </div>
      )}
    </div>
  )
}
