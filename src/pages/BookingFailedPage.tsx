import { Link } from 'react-router-dom'

import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'
import { useRedirectCountdown } from '../hooks/useRedirectCountdown'

export function BookingFailedPage() {
  usePageMeta(staticPageMeta('/booking-failed'))
  const countdown = useRedirectCountdown(8, '/')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-poppins">
      <div className="max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-900 shadow-card">
        <h1 className="mb-1 text-2xl font-bold text-secondary">
          Booking Failed
        </h1>
        <h2 className="mb-4 text-3xl font-bold text-primary">
          Oops! Something went wrong.
        </h2>
        <p className="text-sm text-gray-600">
          We couldn&apos;t process your slot booking at this time. Please try
          again later.
        </p>
        <Link
          to="/book"
          className="mt-6 inline-block w-full rounded-xl bg-primary px-6 py-3 text-center font-semibold text-white shadow-btn transition hover:opacity-90"
        >
          Try Again
        </Link>
        <p className="mt-4 text-xs text-gray-400">
          Redirecting you to homepage in{' '}
          <span className="font-semibold text-secondary">{countdown}s</span>
        </p>
      </div>
    </div>
  )
}
