import type { LearningPathLink, NavLinkItem } from '../types/navigation'

/** Learning paths shown in the navbar dropdown and mobile menu. */
export const LEARNING_PATHS: LearningPathLink[] = [
  {
    label: 'Junior Coders',
    description: 'Ages 5–8',
    href: '/courses/junior-coders',
  },
  {
    label: 'Future Developers',
    description: 'Ages 9–12',
    href: '/courses/future-developers',
  },
  {
    label: 'Tech Professionals',
    description: 'Ages 13–18',
    href: '/courses/tech-professionals',
  },
]

/** Routes where the navbar swaps the donate link for favorites + cart. */
export const COMMERCE_PATHS = [
  '/shop',
  '/cart',
  '/checkout',
  '/favorites',
  '/order-confirmation',
]

export const FOOTER_COMPANY_LINKS: NavLinkItem[] = [
  { label: 'About Us', href: '/about' },
  { label: 'Our Programs', href: '/#programs' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact Us', href: '/#contact' },
]

export const FOOTER_PROGRAM_LINKS: LearningPathLink[] = [
  {
    label: 'Junior Coders',
    description: 'Ages 5–8',
    href: '/junior-coders',
  },
  {
    label: 'Future Developers',
    description: 'Ages 9–12',
    href: '/future-developers',
  },
  {
    label: 'Tech Professionals',
    description: 'Ages 13–18',
    href: '/tech-professionals',
  },
]

export const FOOTER_RESOURCE_LINKS: NavLinkItem[] = [
  { label: 'Parent Guides', href: '/blog?category=Parent%20Guides' },
  { label: 'Student Projects', href: '/#projects' },
  { label: 'Parent Testimonials', href: '/#testimonials' },
  { label: 'Learning Resources', href: '/shop' },
  { label: 'Book a Free Trial', href: '/book-class' },
]

export const FOOTER_LEGAL_LINKS: NavLinkItem[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Child Safety', href: '/child-safety' },
]
