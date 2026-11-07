import type { LucideIcon } from 'lucide-react'

/** A floating icon around the hero emblem on a program resources page. */
export type HeroOrbit = {
  icon: LucideIcon
  size: number
  className: string
}

/** Copy and styling for one program resources page (e.g. `/junior-coders`). */
export type ProgramShopContent = {
  /** `shop_products.program` value and the URL path segment. */
  program: string
  badge: string
  headline: string
  highlight: string
  highlightGradientClass: string
  description: string
  heroBackgroundClass: string
  secondaryButtonClass: string
  glowClass: string
  emblemRingClass: string
  emblemClass: string
  emblemIcon: LucideIcon
  /** Top-left, bottom-right and top-right icons around the emblem. */
  orbits: [HeroOrbit, HeroOrbit, HeroOrbit]
  productsAnchor: string
  collectionTitle: string
  collectionSubtitle: string
  searchPlaceholder: string
  ctaGradientClass: string
  ctaEyebrow: string
  ctaTitle: string
  ctaText: string
}
