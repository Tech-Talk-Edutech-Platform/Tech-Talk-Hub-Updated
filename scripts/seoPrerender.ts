/**
 * Vite plugin that gives every public page its own head tags in plain HTML,
 * so crawlers and link previews that don't run JavaScript still see the right
 * title, description, canonical URL, social card and structured data.
 *
 * - Dev and build: fills the `<!-- seo:start -->…<!-- seo:end -->` block in
 *   index.html with the home page's tags.
 * - Build: writes `<route>.html` for every entry in STATIC_PAGES, plus
 *   every active product and published blog post when Supabase env vars are
 *   set; then sitemap.xml, robots.txt, 404.html and app.html (the SPA
 *   fallback for everything else, which carries no canonical URL).
 *
 * The browser keeps the tags current on client-side navigation with
 * usePageMeta, which reads the same data, so both always agree.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createClient } from '@supabase/supabase-js'
import type { Plugin, ResolvedConfig } from 'vite'

import {
  NOT_FOUND_META,
  STATIC_PAGES,
  type SitemapEntry,
} from '../src/data/seo'
import {
  absoluteUrl,
  buildMetaTags,
  canonicalUrl,
  formatTitle,
  SITE_URL,
  type PageMeta,
} from '../src/lib/seo'
import {
  blogPostPageMeta,
  blogPostSchema,
  productPageMeta,
  productSchema,
  type BlogPostFields,
  type ProductFields,
} from '../src/lib/structuredData'
import type { Database } from '../src/types/database'
import { APP_ROLES } from '../src/types/roles'

const START_MARKER = '<!-- seo:start -->'
const END_MARKER = '<!-- seo:end -->'
const HEAD_INDENT = '\n    '
const FETCH_TIMEOUT_MS = 15_000

/** Slugs that are safe to use as a directory name; others fall back to the SPA. */
const SAFE_SLUG = /^[\w-]+$/

/** App areas behind sign-in, plus the old site's private paths. */
const DISALLOWED_PATHS = [
  '/admin',
  '/dashboard',
  '/login',
  '/cart',
  '/checkout',
  '/favorites',
  '/classroom',
  '/landing',
  '/assign-homework',
  '/receive-homework',
  '/student-assignment',
  '/upload-notes',
  '/upload-results',
  '/create-exam',
  '/exam',
  '/results',
  '/receipt',
  '/users',
  '/learning',
  '/calendar',
  ...APP_ROLES.map((role) => `/${role}`),
]

type HeadOptions = {
  /** Fallback pages serve many URLs, so they mustn't claim one. */
  canonical?: boolean
  jsonLd?: Record<string, unknown>
}

type Page = {
  path: string
  meta: PageMeta
  jsonLd?: Record<string, unknown>
}

type SitemapUrl = SitemapEntry & {
  path: string
  lastModified?: string | null
}

type ProductRow = ProductFields & {
  updated_at: string | null
  created_at: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderHead(
  meta: PageMeta,
  { canonical = true, jsonLd }: HeadOptions = {},
): string {
  const lines = [`<title>${escapeHtml(formatTitle(meta.title))}</title>`]

  for (const tag of buildMetaTags(meta)) {
    if (!canonical && tag.key === 'og:url') {
      continue
    }

    lines.push(
      `<meta ${tag.attribute}="${escapeHtml(tag.key)}" content="${escapeHtml(tag.content)}" />`,
    )
  }

  if (canonical) {
    lines.push(
      `<link rel="canonical" href="${escapeHtml(canonicalUrl(meta))}" />`,
    )
  }

  if (jsonLd) {
    // `id` lets the JsonLd component remove this copy once React renders its own.
    lines.push(
      `<script type="application/ld+json" id="prerendered-jsonld">${JSON.stringify(
        jsonLd,
      ).replace(/</g, '\\u003c')}</script>`,
    )
  }

  return [START_MARKER, ...lines, END_MARKER].join(HEAD_INDENT)
}

function withHead(template: string, head: string): string {
  const start = template.indexOf(START_MARKER)
  const end = template.indexOf(END_MARKER)

  if (start === -1 || end === -1) {
    throw new Error(
      `index.html needs ${START_MARKER} and ${END_MARKER} around its SEO tags.`,
    )
  }

  return (
    template.slice(0, start) + head + template.slice(end + END_MARKER.length)
  )
}

function sitemapXml(urls: SitemapUrl[]): string {
  const entries = urls.map((url) => {
    const loc = absoluteUrl(url.path)
    const lastModified = url.lastModified
      ? `\n    <lastmod>${new Date(url.lastModified).toISOString()}</lastmod>`
      : ''

    return `  <url>
    <loc>${escapeHtml(loc)}</loc>${lastModified}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`
}

function robotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    ...DISALLOWED_PATHS.map((disallowed) => `Disallow: ${disallowed}`),
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n')
}

/**
 * `/` → index.html, `/blog/post` → blog/post.html. Flat files suit hosts with
 * clean URLs (Vercel `cleanUrls`, Netlify, Cloudflare Pages, Firebase), which
 * serve them at `/blog/post` without a trailing-slash redirect.
 */
async function writePage(outDir: string, route: string, html: string) {
  const segments = route.split('/').filter(Boolean)
  const file =
    segments.length === 0
      ? path.join(outDir, 'index.html')
      : `${path.join(outDir, ...segments)}.html`

  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, html)
}

async function fetchDynamicContent(config: ResolvedConfig) {
  const url = config.env.VITE_SUPABASE_URL
  const key = config.env.VITE_SUPABASE_ANON_KEY

  if (typeof url !== 'string' || !url || typeof key !== 'string' || !key) {
    config.logger.warn(
      '[seo] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set: product and blog pages are left to the SPA and out of sitemap.xml.',
    )
    return { products: [], posts: [] }
  }

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false },
  })

  const [productsResponse, postsResponse] = await Promise.all([
    supabase
      .from('shop_products')
      .select(
        'name, slug, description, short_description, image_url, gallery_urls, currency, price, track_inventory, stock_quantity, updated_at, created_at',
      )
      .eq('is_active', true)
      .abortSignal(AbortSignal.timeout(FETCH_TIMEOUT_MS)),
    supabase
      .from('blog_posts')
      .select(
        'title, slug, excerpt, cover_image_url, published_at, created_at, updated_at',
      )
      .eq('status', 'published')
      .abortSignal(AbortSignal.timeout(FETCH_TIMEOUT_MS)),
  ])

  if (productsResponse.error) {
    config.logger.warn(
      `[seo] Could not load products: ${productsResponse.error.message}`,
    )
  }

  if (postsResponse.error) {
    config.logger.warn(
      `[seo] Could not load blog posts: ${postsResponse.error.message}`,
    )
  }

  const products: ProductRow[] = (productsResponse.data ?? []).filter(
    (product) => Boolean(product.slug),
  )
  const posts: BlogPostFields[] = (postsResponse.data ?? []).filter((post) =>
    Boolean(post.slug),
  )

  return { products, posts }
}

async function prerender(config: ResolvedConfig) {
  const outDir = path.resolve(config.root, config.build.outDir)
  const template = await readFile(path.join(outDir, 'index.html'), 'utf8')
  const { products, posts } = await fetchDynamicContent(config)

  const pages: Page[] = Object.values(STATIC_PAGES).map(({ meta }) => ({
    path: meta.path,
    meta,
  }))
  const sitemap: SitemapUrl[] = Object.values(STATIC_PAGES).flatMap((page) =>
    'sitemap' in page ? [{ path: page.meta.path, ...page.sitemap }] : [],
  )

  for (const product of products) {
    const route = `/shop/${product.slug}`

    sitemap.push({
      path: `/shop/${encodeURIComponent(product.slug)}`,
      lastModified: product.updated_at || product.created_at,
      changefreq: 'weekly',
      priority: 0.8,
    })

    if (SAFE_SLUG.test(product.slug)) {
      pages.push({
        path: route,
        meta: productPageMeta(product),
        jsonLd: productSchema(product),
      })
    }
  }

  for (const post of posts) {
    sitemap.push({
      path: `/blog/${encodeURIComponent(post.slug)}`,
      lastModified: post.updated_at || post.published_at || post.created_at,
      changefreq: 'monthly',
      priority: 0.7,
    })

    if (SAFE_SLUG.test(post.slug)) {
      pages.push({
        path: `/blog/${post.slug}`,
        meta: blogPostPageMeta(post),
        jsonLd: blogPostSchema(post),
      })
    }
  }

  await Promise.all([
    ...pages.map((page) =>
      writePage(
        outDir,
        page.path,
        withHead(template, renderHead(page.meta, { jsonLd: page.jsonLd })),
      ),
    ),
    writeFile(
      path.join(outDir, '404.html'),
      withHead(template, renderHead(NOT_FOUND_META, { canonical: false })),
    ),
    writeFile(
      path.join(outDir, 'app.html'),
      withHead(
        template,
        renderHead(STATIC_PAGES['/'].meta, { canonical: false }),
      ),
    ),
    writeFile(path.join(outDir, 'sitemap.xml'), sitemapXml(sitemap)),
    writeFile(path.join(outDir, 'robots.txt'), robotsTxt()),
  ])

  config.logger.info(
    `[seo] Prerendered ${pages.length} pages (${products.length} products, ${posts.length} posts) and ${sitemap.length} sitemap URLs.`,
  )
}

export function seoPrerender(): Plugin {
  let config: ResolvedConfig

  return {
    name: 'tth-seo-prerender',
    configResolved(resolved) {
      config = resolved
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return withHead(html, renderHead(STATIC_PAGES['/'].meta))
      },
    },
    async closeBundle() {
      if (config.command !== 'build' || config.build.ssr) {
        return
      }

      await prerender(config)
    },
  }
}
