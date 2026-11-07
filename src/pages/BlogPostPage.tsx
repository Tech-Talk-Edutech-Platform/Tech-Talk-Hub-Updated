import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Clock3,
  Heart,
  Loader2,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { ArticleCallToAction } from '../components/blog/article/ArticleCallToAction'
import { ArticleContent } from '../components/blog/article/ArticleContent'
import { ArticleSidebar } from '../components/blog/article/ArticleSidebar'
import { MobileTableOfContents } from '../components/blog/article/MobileTableOfContents'
import { RelatedArticles } from '../components/blog/article/RelatedArticles'
import { JsonLd } from '../components/seo/JsonLd'
import { FillImage } from '../components/ui/FillImage'
import { useBlogPost, useRelatedPosts } from '../hooks/useBlog'
import { usePageMeta } from '../hooks/usePageMeta'
import {
  calculateReadingTime,
  extractHeadings,
  extractMarkdownImages,
  formatPostDate,
  getArticleCategoryStyle,
} from '../lib/blog'
import { blogPostPageMeta, blogPostSchema } from '../lib/structuredData'
import { NotFoundPage } from './NotFoundPage'

/** `/blog/:slug` */
export function BlogPostPage() {
  const { slug = '' } = useParams()
  const postQuery = useBlogPost(slug)
  const post = postQuery.data
  const relatedQuery = useRelatedPosts(post)

  usePageMeta(post ? blogPostPageMeta(post) : null)

  if (postQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#7651EF]" />
      </main>
    )
  }

  if (!post) {
    return <NotFoundPage />
  }

  const content = post.content || ''
  const readingTime = calculateReadingTime(content)
  const headings = extractHeadings(content)
  const articleImages = extractMarkdownImages(content)
  const categoryStyle = getArticleCategoryStyle(post.category)

  return (
    <main className="min-h-screen bg-white text-[#172554]">
      <JsonLd data={blogPostSchema(post)} />

      <header className="relative overflow-hidden bg-gradient-to-br from-white via-[#FCFAFF] to-[#F4EEFF] px-5 pt-16 pb-10 sm:px-6 sm:pt-20 sm:pb-12 lg:px-8">
        <div className="pointer-events-none absolute top-14 -left-36 h-80 w-80 rounded-full bg-[#9B6CFF]/10 blur-[110px]" />
        <div className="pointer-events-none absolute top-0 -right-28 h-96 w-96 rounded-full bg-[#FF3F7F]/10 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl">
          <Link
            to="/blog"
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#FF3F7F]"
          >
            <ArrowLeft size={17} />
            Back to all stories
          </Link>

          <div className="max-w-4xl">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black tracking-[0.16em] uppercase ${categoryStyle.background} ${categoryStyle.text} ${categoryStyle.border}`}
            >
              <Sparkles size={14} />
              {post.category || 'Tech Talk Hub'}
            </span>

            <h1 className="mt-3 text-3xl leading-[1.08] font-black tracking-tight text-[#2947C7] sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                {post.excerpt}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-[#7651EF]">
                  <UserRound size={15} />
                </span>
                Tech Talk Hub Team
              </span>
              <span className="flex items-center gap-2">
                <Calendar size={16} />
                {formatPostDate(post.published_at || post.created_at, 'long')}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 size={16} />
                {readingTime} min read
              </span>
            </div>
          </div>
        </div>
      </header>

      {post.cover_image_url && (
        <section className="relative z-10 mx-auto -mt-6 max-w-6xl px-4 sm:-mt-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-2xl shadow-purple-900/10 sm:rounded-[2rem]">
            <div className="relative aspect-[16/9]">
              <FillImage
                src={post.cover_image_url}
                alt={post.title}
                priority
                sizes="(max-width: 1152px) 100vw, 1152px"
                className="object-contain"
              />
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[230px_minmax(0,760px)] lg:justify-center lg:gap-16">
          <ArticleSidebar headings={headings} readingTime={readingTime} />

          <article className="min-w-0">
            <MobileTableOfContents headings={headings} />

            <div className="mb-7 flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-slate-400 uppercase">
              <BadgeCheck size={15} className="text-[#7651EF]" />
              Parent-friendly guide
            </div>

            <ArticleContent content={content} />

            <ArticleCallToAction image={articleImages.at(-1)} />

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <Link
                to="/blog"
                className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#FF3F7F]"
              >
                <ArrowLeft size={16} />
                Back to all articles
              </Link>
              <span className="inline-flex items-center gap-2 text-sm text-slate-400">
                <Heart size={15} className="text-[#FF3F7F]" />
                Created for curious young minds
              </span>
            </div>
          </article>
        </div>
      </section>

      <RelatedArticles posts={relatedQuery.data ?? []} />
    </main>
  )
}
