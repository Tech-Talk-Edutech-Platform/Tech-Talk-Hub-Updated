import type { LucideIcon } from 'lucide-react'

import type { Tables } from './database'

/** A published row from the Supabase `blog_posts` table. */
export type BlogPost = Tables<'blog_posts'>

/** The columns the blog list and related-article cards need. */
export type BlogPostSummary = Pick<
  BlogPost,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'content'
  | 'category'
  | 'cover_image_url'
  | 'published_at'
  | 'created_at'
>

export type BlogCategory = {
  label: string
  /** Value of `blog_posts.category`; `all` shows every post. */
  value: string
  icon: LucideIcon
}

export type CategoryStyle = {
  background: string
  text: string
  border: string
  dot?: string
}

export type ArticleHeading = {
  /** Unique within the article, even when two headings share a title. */
  key: string
  id: string
  title: string
}

export type ArticleImageData = {
  src: string
  alt: string
}

/** A tinted card with an icon tile (blog resources, age groups, benefits). */
export type TintedCard = {
  title: string
  description: string
  icon: LucideIcon
  /** Card background classes. */
  background: string
  iconBackground: string
  iconColor: string
  border?: string
  subtitle?: string
  href?: string
}
