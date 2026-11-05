import { ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { WHATSAPP_URL } from '../../data/site'

type PricingStatusProps =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }

/** Placeholder shown in place of the plan grid while loading, on error, or with no plans. */
export function PricingStatus(props: PricingStatusProps) {
  if (props.status === 'loading') {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-purple-100 bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2947C7]" />

          <p className="mt-4 text-sm text-slate-500">
            Loading learning plans...
          </p>
        </div>
      </div>
    )
  }

  if (props.status === 'error') {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-10 text-center">
        <p className="text-base font-semibold text-slate-800">
          {props.message}
        </p>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF3F7F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#E93470]"
        >
          Contact Us on WhatsApp
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-dashed border-purple-200 bg-white p-10 text-center">
      <p className="text-lg font-bold text-[#172554]">
        Pricing plans are being updated.
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Please contact us for current program availability.
      </p>

      <Link
        to="/#contact"
        className="mt-5 inline-flex items-center gap-2 font-bold text-[#FF3F7F]"
      >
        Contact Our Team
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
