import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

const VARIANTS = {
  desktop: {
    link: 'h-11 w-11 shadow-sm transition',
    iconSize: 19,
    badge: '-right-2 -top-2 h-5 min-w-5 text-[9px]',
    maxCount: 99,
  },
  mobile: {
    link: 'h-10 w-10',
    iconSize: 18,
    badge: '-right-1 -top-1 h-4 min-w-4 text-[8px]',
    maxCount: Infinity,
  },
}

const TONES = {
  favorites: {
    desktopLink: 'text-slate-600 hover:border-pink-200 hover:text-[#ff4b7c]',
    badge: 'bg-[#ff4b7c]',
  },
  cart: {
    desktopLink: 'text-slate-700 hover:border-primary/30 hover:text-primary',
    badge: 'bg-secondary',
  },
}

type NavIconLinkProps = {
  to: string
  label: string
  icon: LucideIcon
  count: number
  variant: keyof typeof VARIANTS
  tone: keyof typeof TONES
}

/** Square icon link with a count bubble (navbar favorites and cart). */
export function NavIconLink({
  to,
  label,
  icon: Icon,
  count,
  variant,
  tone,
}: NavIconLinkProps) {
  const size = VARIANTS[variant]
  const colors = TONES[tone]

  return (
    <Link
      to={to}
      aria-label={label}
      className={`relative flex items-center justify-center rounded-xl border border-slate-200 bg-white ${size.link} ${
        variant === 'desktop' ? colors.desktopLink : ''
      }`}
    >
      <Icon size={size.iconSize} />

      {count > 0 && (
        <span
          className={`absolute flex items-center justify-center rounded-full px-1 font-black text-white ${size.badge} ${colors.badge}`}
        >
          {count > size.maxCount ? `${size.maxCount}+` : count}
        </span>
      )}
    </Link>
  )
}
