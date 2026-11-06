import { Heart, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LEARNING_PATHS } from '../../data/navigation'

declare module 'react' {
  interface HTMLAttributes<T> {
    inert?: boolean
  }
}

type MobileMenuProps = {
  isOpen: boolean
  isCommercePage: boolean
  favoriteCount: number
  cartCount: number
  onNavigate: () => void
  onPricingClick: () => void
}

/** Collapsible navigation panel shown below the navbar on small screens. */
export function MobileMenu({
  isOpen,
  isCommercePage,
  favoriteCount,
  cartCount,
  onNavigate,
  onPricingClick,
}: MobileMenuProps) {
  return (
    <div
      id="mobile-menu"
      inert={!isOpen}
      className={`overflow-hidden border-t bg-white transition-all duration-300 lg:hidden ${
        isOpen
          ? 'max-h-[850px] opacity-100'
          : 'max-h-0 border-transparent opacity-0'
      }`}
    >
      <div className="mx-auto flex max-w-xl flex-col gap-2 px-5 py-5">
        <Link
          to="/"
          onClick={onNavigate}
          className="rounded-xl px-4 py-3 text-sm font-semibold"
        >
          Home
        </Link>

        <button
          type="button"
          onClick={onPricingClick}
          className="rounded-xl px-4 py-3 text-left text-sm font-semibold"
        >
          Pricing
        </button>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="mb-2 px-2 text-xs font-bold uppercase text-slate-400">
            Learning Paths
          </p>

          {LEARNING_PATHS.map((path) => (
            <Link
              key={path.href}
              to={path.href}
              onClick={onNavigate}
              className="block rounded-xl px-3 py-2.5"
            >
              <p className="text-sm font-semibold">{path.label}</p>

              <p className="text-xs text-slate-500">{path.description}</p>
            </Link>
          ))}
        </div>

        <Link
          to="/blog"
          onClick={onNavigate}
          className="rounded-xl px-4 py-3 text-sm font-semibold"
        >
          Blog
        </Link>

        <Link
          to="/shop"
          onClick={onNavigate}
          className="rounded-xl px-4 py-3 text-sm font-semibold"
        >
          Shop
        </Link>

        {isCommercePage && (
          <>
            <Link
              to="/favorites"
              onClick={onNavigate}
              className="flex items-center justify-between rounded-xl bg-pink-50 px-4 py-3 text-sm font-bold text-[#e94073]"
            >
              <span className="flex items-center gap-2">
                <Heart size={17} />
                Favorites
              </span>

              <span>{favoriteCount}</span>
            </Link>

            <Link
              to="/cart"
              onClick={onNavigate}
              className="flex items-center justify-between rounded-xl bg-purple-50 px-4 py-3 text-sm font-bold text-primary"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart size={17} />
                My Cart
              </span>

              <span>{cartCount}</span>
            </Link>
          </>
        )}

        <div className="my-2 border-t" />

        <Link
          to="/login"
          onClick={onNavigate}
          className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold"
        >
          Login
        </Link>

        {!isCommercePage && (
          <Link
            to="/donate"
            onClick={onNavigate}
            className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-center text-sm font-semibold text-primary"
          >
            📚 Empower a Learner
          </Link>
        )}

        <Link
          to="/book"
          onClick={onNavigate}
          className="rounded-xl bg-secondary px-4 py-3.5 text-center text-sm font-bold text-white"
        >
          Book a Free Trial
        </Link>
      </div>
    </div>
  )
}
