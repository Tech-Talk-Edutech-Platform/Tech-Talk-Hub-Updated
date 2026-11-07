import { isValidElement, type ReactNode } from 'react'

import type {
  ArticleHeading,
  ArticleImageData,
  CategoryStyle,
} from '../types/blog'

export const ALL_STORIES = 'all'

const dateFormatters = {
  short: new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }),
  long: new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
}

export function formatPostDate(
  value: string | null | undefined,
  month: keyof typeof dateFormatters = 'short',
): string {
  return value
    ? dateFormatters[month].format(new Date(value))
    : 'Recently published'
}

/** Minutes to read at ~220 words a minute, ignoring markdown syntax. */
export function calculateReadingTime(content = ''): number {
  const words = content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  return Math.max(1, Math.ceil(words / 220))
}

/** Category badge colours on the blog list. */
export function getCategoryStyle(category = ''): CategoryStyle {
  const value = category.toLowerCase()

  if (value.includes('parent')) {
    return {
      background: 'bg-[#FFF1F5]',
      text: 'text-[#FF3F7F]',
      border: 'border-[#FFD9E5]',
      dot: 'bg-[#FF3F7F]',
    }
  }

  if (value.includes('student')) {
    return {
      background: 'bg-[#ECFDF5]',
      text: 'text-[#059669]',
      border: 'border-[#B7EED8]',
      dot: 'bg-[#10B981]',
    }
  }

  if (value.includes('technology')) {
    return {
      background: 'bg-[#FFF6E9]',
      text: 'text-[#D97706]',
      border: 'border-[#FCE4BC]',
      dot: 'bg-[#F59E0B]',
    }
  }

  if (value.includes('education')) {
    return {
      background: 'bg-[#EEF7FF]',
      text: 'text-[#2563EB]',
      border: 'border-[#D6E8FF]',
      dot: 'bg-[#3B82F6]',
    }
  }

  return {
    background: 'bg-[#F2EEFF]',
    text: 'text-[#7356F4]',
    border: 'border-[#E1D9FF]',
    dot: 'bg-[#7951EF]',
  }
}

/** Category badge colours on an article page and its related articles. */
export function getArticleCategoryStyle(
  category?: string | null,
): CategoryStyle {
  const value = (category ?? '').toLowerCase()

  if (value.includes('parent')) {
    return {
      background: 'bg-[#FFF3F7]',
      text: 'text-[#FF3F7F]',
      border: 'border-[#FFD9E5]',
    }
  }

  if (value.includes('student')) {
    return {
      background: 'bg-[#ECFDF5]',
      text: 'text-[#059669]',
      border: 'border-[#A7F3D0]',
    }
  }

  if (value.includes('coding')) {
    return {
      background: 'bg-[#F1EEFF]',
      text: 'text-[#7356F4]',
      border: 'border-[#DDD5FF]',
    }
  }

  return {
    background: 'bg-[#EEF5FF]',
    text: 'text-[#315DF5]',
    border: 'border-[#D9E6FF]',
  }
}

export function createHeadingId(value = ''): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Plain text of rendered markdown children (for heading ids). */
export function getNodeText(value: ReactNode): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map((child: ReactNode) => getNodeText(child)).join('')
  }

  if (isValidElement<{ children?: ReactNode }>(value)) {
    return getNodeText(value.props.children)
  }

  return ''
}

/** `## ` headings, for the table of contents. */
export function extractHeadings(content = ''): ArticleHeading[] {
  const seen = new Map<string, number>()

  return content.split('\n').flatMap((line) => {
    const match = /^##\s+(.+)$/.exec(line)

    if (!match) {
      return []
    }

    const title = match[1].replace(/\*\*/g, '').trim()
    const id = createHeadingId(title)
    const occurrence = seen.get(id) ?? 0
    seen.set(id, occurrence + 1)

    return [{ key: `${id}-${occurrence}`, id, title }]
  })
}

export function extractMarkdownImages(content = ''): ArticleImageData[] {
  const pattern = /!\[([^\]]*)\]\((\S+?)(?:\s+["'][^"']*["'])?\)/g

  return Array.from(content.matchAll(pattern), (match) => ({
    alt: match[1],
    src: match[2],
  }))
}

/** Age-group cards follow a "what age…" heading when the article mentions the age bands. */
export function shouldShowAgeCards(heading: string, content: string): boolean {
  const value = heading.toLowerCase()

  if (!value.includes('age') && !value.includes('start coding')) {
    return false
  }

  return (
    /ages?\s*5\s*[–-]\s*8/i.test(content) ||
    /ages?\s*9\s*[–-]\s*12/i.test(content) ||
    /ages?\s*13\s*[–-]\s*18/i.test(content)
  )
}

export function shouldShowBenefitsCards(heading: string): boolean {
  const value = heading.toLowerCase()

  return value.includes('benefit') || value.includes('why coding matters')
}

export function shouldShowChecklist(heading: string): boolean {
  const value = heading.toLowerCase()

  return (
    value.includes('good coding class') ||
    value.includes('choose the right coding')
  )
}
