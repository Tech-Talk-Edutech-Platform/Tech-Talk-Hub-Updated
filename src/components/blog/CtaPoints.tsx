import { CheckCircle2 } from 'lucide-react'

import { BLOG_CTA_POINTS } from '../../data/blog'

/** "Live classes · Practical projects · Ages 5–18" ticks on the blog's call-to-action panels. */
export function CtaPoints() {
  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/85">
      {BLOG_CTA_POINTS.map((point) => (
        <span key={point} className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={15} />
          {point}
        </span>
      ))}
    </div>
  )
}
