import { Heart, Menu, ShoppingCart, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { COMMERCE_PATHS } from '../../data/navigation'
import { DASHBOARD_URL } from '../../data/site'
import { useCart } from '../../hooks/useCart'
import { useFavoriteCount } from '../../hooks/useFavoriteCount'
import { useScrolled } from '../../hooks/useScrolled'
import { BrandLogo } from './BrandLogo'
import { LearningPathsDropdown } from './LearningPathsDropdown'
import { MobileMenu } from './MobileMenu'
import { NavIconLink } from './NavIconLink'

const DESKTOP_LINK_CLASS =
  'text-sm font-semibold text-slate-700 hover:text-secondary'

export function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const scrolled = useScrolled(12)
  const favoriteCount = useFavoriteCount()
  const { cartCount } = useCart()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const isCommercePage = COMMERCE_PATHS.some((path) =>
    pathname.startsWith(path),
  )

  function closeMenu() {
    setIsMenuOpen(false)
  }

  function scrollToSection(id: string) {
    if (pathname === '/') {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      void navigate(`/#${id}`)
    }

    closeMenu()
  }

  return (
    <nav
      className={`fixed left-0 top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/70 bg-white/90 shadow-sm backdrop-blur-xl'
          : 'bg-white/80 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <BrandLogo onClick={closeMenu} />

        {/* Desktop links */}
        <div className="hidden items-center gap-8 lg:flex">
          <Link to="/" className={DESKTOP_LINK_CLASS}>
            Home
          </Link>

          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className={DESKTOP_LINK_CLASS}
          >
            Pricing
          </button>

          <LearningPathsDropdown />

          <Link to="/blog" className={DESKTOP_LINK_CLASS}>
            Blog
          </Link>

          <Link
            to="/shop"
            className={`text-sm font-semibold hover:text-secondary ${
              pathname.startsWith('/shop') ? 'text-secondary' : 'text-slate-700'
            }`}
          >
            Shop
          </Link>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Login
          </a>

          {isCommercePage ? (
            <>
              <NavIconLink
                to="/favorites"
                label="Favorites"
                icon={Heart}
                count={favoriteCount}
                variant="desktop"
                tone="favorites"
              />

              <NavIconLink
                to="/cart"
                label="Shopping cart"
                icon={ShoppingCart}
                count={cartCount}
                variant="desktop"
                tone="cart"
              />
            </>
          ) : (
            <Link
              to="/donate"
              className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-2.5 text-xs font-bold text-primary"
            >
              📚 Empower a Learner
            </Link>
          )}

          <Link
            to="/book"
            className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-secondary/20"
          >
            Book Trial
          </Link>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 lg:hidden">
          {isCommercePage && (
            <>
              <NavIconLink
                to="/favorites"
                label="Favorites"
                icon={Heart}
                count={favoriteCount}
                variant="mobile"
                tone="favorites"
              />

              <NavIconLink
                to="/cart"
                label="Shopping cart"
                icon={ShoppingCart}
                count={cartCount}
                variant="mobile"
                tone="cart"
              />
            </>
          )}

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            className="rounded-xl p-2.5 text-slate-700"
          >
            {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>

      <MobileMenu
        isOpen={isMenuOpen}
        isCommercePage={isCommercePage}
        favoriteCount={favoriteCount}
        cartCount={cartCount}
        onNavigate={closeMenu}
        onPricingClick={() => scrollToSection('pricing')}
      />
    </nav>
  )
}
