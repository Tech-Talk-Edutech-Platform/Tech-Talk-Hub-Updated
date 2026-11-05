import { BadgeCheck, Mail, MessageCircle } from 'lucide-react'

import type { Testimonial } from '../../types/testimonial'
import { FillImage } from '../ui/FillImage'

type TestimonialCardProps = {
  testimonial: Testimonial
}

/** A verified parent feedback screenshot with its source and name. */
export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const isWhatsApp = testimonial.source === 'whatsapp'
  const parentName = testimonial.parent_name || 'a Tech Talk Hub parent'

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(30,41,59,0.08)]">
      <div className="relative aspect-[4/5] bg-slate-100">
        <FillImage
          src={testimonial.screenshot_url}
          alt={`Verified ${isWhatsApp ? 'WhatsApp' : 'email'} feedback from ${parentName}`}
          className="object-contain"
        />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              isWhatsApp
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            {isWhatsApp ? (
              <MessageCircle className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {isWhatsApp ? 'WhatsApp Feedback' : 'Email Feedback'}
          </span>

          <BadgeCheck className="h-5 w-5 text-primary" />
        </div>

        {testimonial.feedback && (
          <p className="mt-4 text-sm leading-6 text-slate-600">
            “{testimonial.feedback}”
          </p>
        )}

        <p className="mt-4 font-bold text-primary">
          {testimonial.parent_name || 'Verified Parent'}
        </p>
      </div>
    </article>
  )
}
