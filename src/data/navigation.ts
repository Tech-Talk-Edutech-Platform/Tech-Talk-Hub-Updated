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
  { label: 'Book a Free Trial', href: '/book' },
]

/**
 * Public pages the site links to that haven't been migrated from the old site.
 * Each renders a "coming soon" page; remove an entry once its real page exists.
 */
export const UPCOMING_PAGES: { path: string; title: string }[] = [
  { path: '/about', title: 'About Us' },
  { path: '/blog', title: 'Blog' },
  { path: '/careers', title: 'Careers' },
  { path: '/shop', title: 'Shop' },
  { path: '/cart', title: 'Your Cart' },
  { path: '/favorites', title: 'Favorites' },
  { path: '/donate', title: 'Empower a Learner' },
  { path: '/courses', title: 'Courses' },
  { path: '/courses/junior-coders', title: 'Junior Coders' },
  { path: '/courses/future-developers', title: 'Future Developers' },
  { path: '/courses/tech-professionals', title: 'Tech Professionals' },
  { path: '/junior-coders', title: 'Junior Coders' },
  { path: '/future-developers', title: 'Future Developers' },
  { path: '/tech-professionals', title: 'Tech Professionals' },
  { path: '/privacy', title: 'Privacy Policy' },
  { path: '/terms', title: 'Terms & Conditions' },
  { path: '/child-safety', title: 'Child Safety' },
]

export const FOOTER_LEGAL_LINKS: NavLinkItem[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Child Safety', href: '/child-safety' },
]
