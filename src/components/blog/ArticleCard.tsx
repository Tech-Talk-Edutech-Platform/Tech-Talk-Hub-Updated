import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { BlogPostSummary } from '../../types/blog'
import { ArticleMeta } from './ArticleMeta'
import { BlogCoverImage } from './BlogCoverImage'
import { CategoryBadge } from './CategoryBadge'

type ArticleCardProps = {
  post: BlogPostSummary
}

export function ArticleCard({ post }: ArticleCardProps) {
  const href = `/blog/${post.slug}`

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-950/[0.06]">
      <Link
        to={href}
        className="relative mx-auto block aspect-[16/9] w-full max-w-5xl overflow-hidden border-b border-purple-50 bg-[#F8F5FF] lg:aspect-[2.4/1]"
      >
        <BlogCoverImage
          post={post}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <CategoryBadge category={post.category} />
        <h3 className="mt-4 text-lg leading-snug font-black text-[#2947C7] sm:text-xl">
          <Link to={href} className="transition hover:text-[#7651EF]">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <ArticleMeta post={post} compact />
            <Link
              to={href}
              aria-label={`Read ${post.title}`}
              className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-[#7651EF] transition hover:bg-[#7651EF] hover:text-white"
            >
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
