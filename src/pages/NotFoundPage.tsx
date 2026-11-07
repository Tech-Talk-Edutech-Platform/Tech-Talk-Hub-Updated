import { Link } from 'react-router-dom'

import { NOT_FOUND_META } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

/** Site-wide 404. Also rendered for unknown slugs (blog posts, products, programs). */
export function NotFoundPage() {
  usePageMeta(NOT_FOUND_META)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center font-poppins">
      <h1 className="mb-6 bg-linear-to-r/srgb from-[#3F51B5] via-[#FF4081] to-[#00BFA5] bg-clip-text text-9xl font-extrabold text-transparent select-none">
        404
      </h1>
      <p className="mb-4 text-2xl text-text">Oops! Page Not Found.</p>
      <p className="mb-10 max-w-md text-base text-text">
        The page you are looking for doesn’t exist or has been moved.
      </p>
      <Link
        to="/"
        className="rounded-xl bg-primary px-8 py-3 font-semibold text-white shadow-btn transition duration-300 hover:bg-secondary"
      >
        Go Home
      </Link>
    </div>
  )
}
