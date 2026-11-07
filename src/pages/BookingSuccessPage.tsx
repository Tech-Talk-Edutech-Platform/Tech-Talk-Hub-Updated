import { Link } from 'react-router-dom'

import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'
import { useRedirectCountdown } from '../hooks/useRedirectCountdown'

export function BookingSuccessPage() {
  usePageMeta(staticPageMeta('/booking-success'))
  const countdown = useRedirectCountdown(5, '/')

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-50 px-4 font-poppins">
      <div className="max-w-md rounded-2xl border border-white/10 bg-accent p-10 text-center text-white shadow-card">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="mb-3 text-3xl font-bold tracking-wide">
          Booking Successful!
        </h1>
        <p className="text-sm font-medium text-white/90">
          Your child&apos;s interactive slot has been secured. You will receive
          a confirmation email with access details soon.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block w-full rounded-xl bg-primary px-6 py-3 text-center font-semibold text-white shadow-btn transition-transform duration-150 hover:scale-[1.02]"
        >
          Back to Home
        </Link>
        <p className="mt-4 text-xs text-white/70">
          Redirecting you to homepage in{' '}
          <span className="font-bold text-white">{countdown}s</span>
        </p>
      </div>
    </div>
  )
}
