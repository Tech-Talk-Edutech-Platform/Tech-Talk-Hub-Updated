import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { BlogPostSummary } from '../../types/blog'
import { ArticleMeta } from './ArticleMeta'
import { BlogCoverImage } from './BlogCoverImage'
import { CategoryBadge } from './CategoryBadge'

type FeaturedArticleProps = {
  post: BlogPostSummary
}

/** The newest post, shown large at the top of the list. */
export function FeaturedArticle({ post }: FeaturedArticleProps) {
  const href = `/blog/${post.slug}`

  return (
    <section
      id="latest-stories"
      className="mx-auto max-w-7xl scroll-mt-32 px-5 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-16 lg:px-8"
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-[#FF3F7F] uppercase">
            Featured article
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#2947C7] sm:text-4xl">
            Start with this story.
          </h2>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Sparkles size={15} className="text-[#7651EF]" />
          Selected for parents
        </span>
      </div>

      <article className="group overflow-hidden rounded-[2rem] border border-purple-100 bg-white shadow-lg shadow-purple-950/[0.04] transition duration-300 hover:shadow-xl">
        <Link
          to={href}
          className="relative block aspect-[16/9] w-full overflow-hidden border-b border-purple-50 bg-[#F8F5FF] lg:aspect-[2.1/1]"
        >
          <BlogCoverImage
            post={post}
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
          />
        </Link>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10 lg:p-10">
          <div className="max-w-4xl">
            <CategoryBadge category={post.category} />
            <h3 className="mt-5 text-2xl leading-tight font-black tracking-tight text-[#2947C7] sm:text-3xl lg:text-4xl">
              <Link to={href} className="transition hover:text-[#7651EF]">
                {post.title}
              </Link>
            </h3>
            {post.excerpt && (
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                {post.excerpt}
              </p>
            )}
            <div className="mt-5">
              <ArticleMeta post={post} showAuthor />
            </div>
          </div>

          <Link
            to={href}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#7651EF] px-6 py-3 text-sm font-black text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-[#6240DD]"
          >
            Read article
            <ArrowRight size={16} />
          </Link>
        </div>
      </article>
    </section>
  )
}
