/**
 * SEO helpers shared by the browser (usePageMeta) and the build-time
 * prerender script (scripts/prerender-seo.ts), so both emit identical tags.
 * Keep this file free of browser APIs.
 */

/**
 * The address search engines should list. Canonicals, og:url, structured data,
 * robots.txt and the sitemap all name it, so it must be the host that serves
 * the pages directly, with no redirect in front. Change it here if the site
 * moves to a custom domain.
 */
export const SITE_URL = 'https://tech-talk-hub-updated.vercel.app'
export const SITE_NAME = 'Tech Talk Hub'

export type MetaImage = {
  url: string
  width?: number
  height?: number
  alt?: string
}

export type PageMeta = {
  /** Page title. ` | Tech Talk Hub` is appended unless it already names the site. */
  title: string
  description: string
  /** Path of the canonical URL, e.g. `/blog`. */
  path: string
  /** Overrides for social cards; fall back to `title` / `description`. */
  ogTitle?: string
  ogDescription?: string
  twitterTitle?: string
  twitterDescription?: string
  image?: MetaImage
  type?: 'website' | 'article'
  /** ISO date, for articles. */
  publishedTime?: string
  /** Keep the page out of search results (cart, checkout, 404, …). */
  noindex?: boolean
}

export type MetaTag = {
  attribute: 'name' | 'property'
  key: string
  content: string
}

export const DEFAULT_IMAGE: MetaImage = {
  url: '/home-hero.png',
  width: 1448,
  height: 1086,
  alt: 'Young African learner coding with Tech Talk Hub',
}

export function formatTitle(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl
  }

  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

export function canonicalUrl(meta: PageMeta): string {
  return absoluteUrl(meta.path)
}

/** Every <meta> tag a page needs, in a stable order. */
export function buildMetaTags(meta: PageMeta): MetaTag[] {
  const title = formatTitle(meta.title)
  const image = meta.image ?? DEFAULT_IMAGE
  const ogTitle = meta.ogTitle ?? title
  const ogDescription = meta.ogDescription ?? meta.description

  const tags: MetaTag[] = [
    { attribute: 'name', key: 'description', content: meta.description },
    {
      attribute: 'name',
      key: 'robots',
      content: meta.noindex ? 'noindex, nofollow' : 'index, follow',
    },
    { attribute: 'property', key: 'og:title', content: ogTitle },
    { attribute: 'property', key: 'og:description', content: ogDescription },
    { attribute: 'property', key: 'og:url', content: canonicalUrl(meta) },
    { attribute: 'property', key: 'og:site_name', content: SITE_NAME },
    { attribute: 'property', key: 'og:type', content: meta.type ?? 'website' },
    {
      attribute: 'property',
      key: 'og:image',
      content: absoluteUrl(image.url),
    },
  ]

  if (image.width && image.height) {
    tags.push(
      {
        attribute: 'property',
        key: 'og:image:width',
        content: String(image.width),
      },
      {
        attribute: 'property',
        key: 'og:image:height',
        content: String(image.height),
      },
    )
  }

  if (image.alt) {
    tags.push({
      attribute: 'property',
      key: 'og:image:alt',
      content: image.alt,
    })
  }

  if (meta.publishedTime) {
    tags.push({
      attribute: 'property',
      key: 'article:published_time',
      content: meta.publishedTime,
    })
  }

  tags.push(
    { attribute: 'name', key: 'twitter:card', content: 'summary_large_image' },
    {
      attribute: 'name',
      key: 'twitter:title',
      content: meta.twitterTitle ?? ogTitle,
    },
    {
      attribute: 'name',
      key: 'twitter:description',
      content: meta.twitterDescription ?? ogDescription,
    },
    {
      attribute: 'name',
      key: 'twitter:image',
      content: absoluteUrl(image.url),
    },
  )

  return tags
}
