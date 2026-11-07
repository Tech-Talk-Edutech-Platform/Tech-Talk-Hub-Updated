/**
 * schema.org structured data and head tags for products and blog posts.
 * Shared by the pages and the build-time prerender (scripts/seoPrerender.ts)
 * so both emit the same tags. Keep this file free of browser APIs.
 */
import type { Tables } from '../types/database'
import { SITE_NAME, SITE_URL, type PageMeta } from './seo'

export type ProductFields = Pick<
  Tables<'shop_products'>,
  | 'name'
  | 'slug'
  | 'description'
  | 'short_description'
  | 'image_url'
  | 'gallery_urls'
  | 'currency'
  | 'price'
  | 'track_inventory'
  | 'stock_quantity'
>

export type BlogPostFields = Pick<
  Tables<'blog_posts'>,
  | 'title'
  | 'slug'
  | 'excerpt'
  | 'cover_image_url'
  | 'published_at'
  | 'created_at'
  | 'updated_at'
>

export function productDescription(product: ProductFields): string {
  return (
    product.short_description ||
    product.description ||
    `Shop ${product.name} at ${SITE_NAME}.`
  )
}

export function productSchema(product: ProductFields): Record<string, unknown> {
  const inStock = !product.track_inventory || (product.stock_quantity || 0) > 0

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description:
      product.short_description || product.description || product.name,
    ...(product.image_url
      ? { image: [product.image_url, ...(product.gallery_urls ?? [])] }
      : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/shop/${product.slug}`,
      priceCurrency: product.currency || 'KES',
      price: product.price || 0,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }
}

export function blogPostSchema(post: BlogPostFields): Record<string, unknown> {
  const organization = {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_image_url || undefined,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: organization,
    publisher: organization,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`,
    },
  }
}

const BLOG_FALLBACK_DESCRIPTION =
  'Discover helpful insights about coding and technology education for young learners.'
const BLOG_FALLBACK_SOCIAL_DESCRIPTION =
  'Read the latest insights from Tech Talk Hub.'

export function productPageMeta(product: ProductFields): PageMeta {
  return {
    title: product.name,
    description: productDescription(product),
    path: `/shop/${product.slug}`,
    ogTitle: `${product.name} | ${SITE_NAME}`,
    image: product.image_url
      ? { url: product.image_url, alt: product.name }
      : undefined,
  }
}

export function blogPostPageMeta(post: BlogPostFields): PageMeta {
  return {
    title: `${post.title} | ${SITE_NAME}`,
    description: post.excerpt || BLOG_FALLBACK_DESCRIPTION,
    path: `/blog/${post.slug}`,
    ogTitle: post.title,
    ogDescription: post.excerpt || BLOG_FALLBACK_SOCIAL_DESCRIPTION,
    type: 'article',
    publishedTime: post.published_at ?? undefined,
    image: post.cover_image_url
      ? { url: post.cover_image_url, width: 1200, height: 630, alt: post.title }
      : undefined,
  }
}
