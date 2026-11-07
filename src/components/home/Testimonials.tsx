import { BadgeCheck } from 'lucide-react'

import { useTestimonials } from '../../hooks/useTestimonials'
import { TestimonialCard } from './TestimonialCard'

/** "What Parents Say" — hidden until there are published testimonials to show. */
export function Testimonials() {
  const testimonialsState = useTestimonials()
  const testimonials =
    testimonialsState.status === 'success' ? testimonialsState.data : []

  if (testimonials.length === 0) {
    return null
  }

  return (
    <div className="bg-white px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] text-secondary uppercase">
            <BadgeCheck className="h-4 w-4" />
            Verified Parent Feedback
          </span>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-primary sm:text-4xl">
            What Parents Say
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Real feedback from families learning with Tech Talk Hub.
          </p>
        </div>

        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Personal details are hidden to protect parent and learner privacy.
        </p>
      </div>
    </div>
  )
}
