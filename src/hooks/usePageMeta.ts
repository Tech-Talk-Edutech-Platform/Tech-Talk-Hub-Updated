import { useEffect } from 'react'

import {
  buildMetaTags,
  canonicalUrl,
  formatTitle,
  type MetaTag,
  type PageMeta,
} from '../lib/seo'

// Tags are flattened to one string so the effect re-runs only when a value
// changes, not on every render (callers pass a fresh `meta` object each time).
const FIELD_SEPARATOR = '\u0000'
const TAG_SEPARATOR = '\u0001'

function encodeTags(tags: MetaTag[]): string {
  return tags
    .map((tag) => [tag.attribute, tag.key, tag.content].join(FIELD_SEPARATOR))
    .join(TAG_SEPARATOR)
}

function decodeTags(encoded: string): MetaTag[] {
  return encoded.split(TAG_SEPARATOR).map((entry) => {
    const [attribute = '', key = '', content = ''] =
      entry.split(FIELD_SEPARATOR)

    return {
      attribute: attribute === 'property' ? 'property' : 'name',
      key,
      content,
    }
  })
}

function upsertMeta({ attribute, key, content }: MetaTag): () => void {
  const existing = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  )

  if (existing) {
    const previous = existing.content
    existing.content = content
    return () => {
      existing.content = previous
    }
  }

  const created = document.createElement('meta')
  created.setAttribute(attribute, key)
  created.content = content
  document.head.append(created)
  return () => created.remove()
}

function upsertCanonical(href: string): () => void {
  const existing = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  )

  if (existing) {
    const previous = existing.href
    existing.href = href
    return () => {
      existing.href = previous
    }
  }

  const created = document.createElement('link')
  created.rel = 'canonical'
  created.href = href
  document.head.append(created)
  return () => created.remove()
}

/**
 * Sets the page title, description, canonical URL and social tags while the
 * page is mounted, and restores the previous head on unmount. Pass `null`
 * while the page's data is still loading.
 *
 * The build step writes the same tags into each route's static HTML, so
 * crawlers that don't run JavaScript see them too.
 */
export function usePageMeta(meta: PageMeta | null) {
  const title = meta ? formatTitle(meta.title) : null
  const canonical = meta ? canonicalUrl(meta) : null
  const encodedTags = meta ? encodeTags(buildMetaTags(meta)) : null

  useEffect(() => {
    if (title === null || canonical === null || encodedTags === null) {
      return undefined
    }

    const previousTitle = document.title
    document.title = title

    const restores = [
      ...decodeTags(encodedTags).map(upsertMeta),
      upsertCanonical(canonical),
    ]

    return () => {
      document.title = previousTitle
      for (const restore of restores.toReversed()) {
        restore()
      }
    }
  }, [title, canonical, encodedTags])
}
