import type { PageMeta } from '../lib/seo'

export type SitemapEntry = {
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: number
}

type StaticPage = {
  meta: PageMeta
  /** Pages without an entry stay out of sitemap.xml. */
  sitemap?: SitemapEntry
}

/**
 * Head tags for every public page with a fixed URL. Pages read their entry
 * with `staticPageMeta`; `scripts/prerender-seo.ts` writes the same tags
 * into each route's HTML and builds sitemap.xml from the `sitemap` entries.
 */
export const STATIC_PAGES = {
  '/': {
    meta: {
      title: 'Tech Talk Hub | Learn Coding & Build the Future',
      description:
        'Live, personalized coding classes helping children aged 5–17 build practical technology skills, confidence and creativity.',
      ogDescription:
        'Live, personalized coding classes for children aged 5–17.',
      path: '/',
    },
    sitemap: { changefreq: 'weekly', priority: 1 },
  },
  '/book': {
    meta: {
      title: 'Book a Free Coding Trial Class | Tech Talk Hub',
      description:
        'Book a free 1-on-1 coding trial with a certified tutor for your child.',
      path: '/book',
      ogTitle: 'Book a Free Coding Trial Class 🚀',
      ogDescription:
        'Give your child a confident start in coding with a free 1-on-1 trial.',
      image: {
        url: '/girl-code.png',
        width: 800,
        height: 600,
        alt: 'Child coding trial',
      },
    },
    sitemap: { changefreq: 'monthly', priority: 0.9 },
  },
  '/about': {
    meta: {
      title: 'About',
      description:
        'Discover how Tech Talk Hub helps African children develop coding, creativity, and problem-solving skills through engaging online classes.',
      path: '/about',
      image: {
        url: '/classroom.png',
        alt: 'Tech Talk Hub learners in an online coding class',
      },
    },
    sitemap: { changefreq: 'monthly', priority: 0.8 },
  },
  '/faculty': {
    meta: {
      title: 'Meet Our Team',
      description:
        'Meet the educators, mentors and builders behind Tech Talk Hub’s coding classes for young creators.',
      path: '/faculty',
    },
    sitemap: { changefreq: 'monthly', priority: 0.6 },
  },
  '/careers': {
    meta: {
      title: 'Careers',
      description:
        'Explore opportunities to help young Africans learn coding, build confidence and create with technology at Tech Talk Hub.',
      path: '/careers',
    },
    sitemap: { changefreq: 'monthly', priority: 0.6 },
  },
  '/curriculum': {
    meta: {
      title: 'Coding Curriculum for Kids',
      description:
        'Explore our flexible coding curriculum from Scratch to AI. Designed for K-12 students to master digital skills at their own pace.',
      path: '/curriculum',
    },
    sitemap: { changefreq: 'weekly', priority: 0.9 },
  },
  '/courses/junior-coders': {
    meta: {
      title: 'Junior Coders | Coding for Ages 5–8',
      description:
        "Explore Junior Coders, Tech Talk Hub's coding pathway for children aged 5–8.",
      path: '/courses/junior-coders',
    },
    sitemap: { changefreq: 'monthly', priority: 0.8 },
  },
  '/courses/future-developers': {
    meta: {
      title: 'Future Developers | Coding for Ages 9–12',
      description:
        "Explore Future Developers, Tech Talk Hub's programming and technology pathway for learners aged 9–12.",
      path: '/courses/future-developers',
    },
    sitemap: { changefreq: 'monthly', priority: 0.8 },
  },
  '/courses/tech-professionals': {
    meta: {
      title: 'Tech Professionals | Technology for Ages 13–18',
      description:
        "Explore Tech Professionals, Tech Talk Hub's advanced technology pathway for teens aged 13–18.",
      path: '/courses/tech-professionals',
    },
    sitemap: { changefreq: 'monthly', priority: 0.8 },
  },
  '/junior-coders': {
    meta: {
      title: 'Junior Coders Resources',
      description:
        'Fun coding books, activities, games and creative learning resources made especially for our youngest creators.',
      path: '/junior-coders',
    },
    sitemap: { changefreq: 'monthly', priority: 0.9 },
  },
  '/future-developers': {
    meta: {
      title: 'Future Developers Resources',
      description:
        'Coding books, developer kits, projects and creative technology resources designed for young learners ready to move from exploring technology to building with it.',
      path: '/future-developers',
    },
    sitemap: { changefreq: 'monthly', priority: 0.9 },
  },
  '/tech-professionals': {
    meta: {
      title: 'Tech Professionals Resources',
      description:
        'Advanced coding resources, project tools and technology materials for young developers ready to build real-world skills and prepare for the future of technology.',
      path: '/tech-professionals',
    },
    sitemap: { changefreq: 'monthly', priority: 0.9 },
  },
  '/shop': {
    meta: {
      title: 'Shop',
      description:
        'Shop coding books, activity books, learning kits and creative technology resources for kids and teens at Tech Talk Hub.',
      path: '/shop',
      ogTitle: 'Shop Coding Books & Learning Resources | Tech Talk Hub',
      ogDescription:
        'Discover coding books, learning resources, activity books and creative tools for young creators.',
      image: {
        url: '/shop/premium-shop-hero.png',
        width: 1200,
        height: 630,
        alt: 'Tech Talk Hub coding books and learning resources',
      },
    },
    sitemap: { changefreq: 'daily', priority: 0.9 },
  },
  '/blog': {
    meta: {
      title: 'Blog | Tech Talk Hub',
      description:
        'Explore practical coding guidance, parent resources, student stories and technology insights for young creators.',
      path: '/blog',
      ogTitle: 'Stories & Insights | Tech Talk Hub',
      ogDescription:
        'Practical coding guidance, parent resources and inspiring stories for families raising young creators.',
      twitterDescription:
        'Coding guidance, parent resources and inspiring stories for young creators.',
      image: {
        url: '/blog-hero.png',
        width: 1200,
        height: 630,
        alt: 'Tech Talk Hub stories and insights',
      },
    },
    sitemap: { changefreq: 'weekly', priority: 0.8 },
  },
  '/privacy': {
    meta: {
      title: 'Privacy Policy | Tech Talk Hub',
      description:
        'Learn how Tech Talk Hub handles personal information from parents, guardians, learners and website visitors.',
      path: '/privacy',
    },
    sitemap: { changefreq: 'yearly', priority: 0.3 },
  },
  '/terms': {
    meta: {
      title: 'Terms & Conditions | Tech Talk Hub',
      description:
        'Review the terms governing participation in Tech Talk Hub coding classes, learning programs and related services.',
      path: '/terms',
    },
    sitemap: { changefreq: 'yearly', priority: 0.3 },
  },
  '/child-safety': {
    meta: {
      title: 'Child Safety | Tech Talk Hub',
      description:
        'Learn about Tech Talk Hub’s approach to creating safe, respectful and supportive online learning experiences for children.',
      path: '/child-safety',
    },
    sitemap: { changefreq: 'yearly', priority: 0.4 },
  },
  '/cart': {
    meta: {
      title: 'Your Cart',
      description: 'Review the learning resources in your Tech Talk Hub cart.',
      path: '/cart',
      noindex: true,
    },
  },
  '/favorites': {
    meta: {
      title: 'Saved Products',
      description: 'Learning resources you saved from the Tech Talk Hub shop.',
      path: '/favorites',
      noindex: true,
    },
  },
  '/checkout': {
    meta: {
      title: 'Checkout',
      description: 'Complete your Tech Talk Hub order.',
      path: '/checkout',
      noindex: true,
    },
  },
  '/booking-success': {
    meta: {
      title: 'Booking Confirmed',
      description: 'Your free Tech Talk Hub trial class is booked.',
      path: '/booking-success',
      noindex: true,
    },
  },
  '/booking-failed': {
    meta: {
      title: 'Booking Failed',
      description: 'We could not complete your Tech Talk Hub booking.',
      path: '/booking-failed',
      noindex: true,
    },
  },
  '/donate': {
    meta: {
      title: 'Empower a Learner',
      description:
        'Help more young Africans learn to code with Tech Talk Hub. This page is coming soon.',
      path: '/donate',
      noindex: true,
    },
  },
} satisfies Record<string, StaticPage>

export type StaticPath = keyof typeof STATIC_PAGES

export const NOT_FOUND_META: PageMeta = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist or has moved.',
  path: '/404',
  noindex: true,
}

export function staticPageMeta(path: StaticPath): PageMeta {
  return STATIC_PAGES[path].meta
}
