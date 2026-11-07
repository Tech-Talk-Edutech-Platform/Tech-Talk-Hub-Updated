import type { LucideIcon } from 'lucide-react'

import type { NavLinkItem } from './navigation'

/** One card on a policy page (privacy, terms, child safety). */
export type PolicySection = {
  icon: LucideIcon
  title: string
  paragraphs?: string[]
  bullets?: string[]
  /** Email / phone links shown at the end of the card. */
  contacts?: NavLinkItem[]
}

export type PolicyPageContent = {
  badge: string
  title: string
  highlightedText: string
  description: string
  /** Short note shown above the cards. */
  notice: string
  noticeTone: 'neutral' | 'pink'
  sections: PolicySection[]
}
