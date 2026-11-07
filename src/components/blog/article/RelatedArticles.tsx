import { ArrowRight, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatPostDate, getArticleCategoryStyle } from '../../../lib/blog'
import type { BlogPostSummary } from '../../../types/blog'
import { FillImage } from '../../ui/FillImage'

type RelatedArticlesProps = {
  posts: BlogPostSummary[]
}

export function RelatedArticles({ posts }: RelatedArticlesProps) {
  if (posts.length === 0) {
    return null
  }

  return (
    <section className="border-t border-purple-50 bg-[#FBFAFF] py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-[#FF3F7F] uppercase">
              More for parents
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#2947C7]">
              Continue reading
            </h2>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-black text-[#7651EF]"
          >
            View all articles
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-9 grid gap-7 md:grid-cols-3">
          {posts.map((post) => {
            const style = getArticleCategoryStyle(post.category)
            const href = `/blog/${post.slug}`

            return (
              <article
                key={post.id}
                className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                {post.cover_image_url ? (
                  <Link
                    to={href}
                    className="relative block aspect-[16/9] overflow-hidden bg-[#F8F5FF]"
                  >
                    <FillImage
                      src={post.cover_image_url}
                      alt={post.title}
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain transition duration-500 group-hover:scale-[1.04]"
                    />
                  </Link>
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-[#F5F0FF] to-[#EEF4FF] text-[#7651EF]">
                    <BookOpen size={38} />
                  </div>
                )}

                <div className="p-6">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.12em] uppercase ${style.background} ${style.text} ${style.border}`}
                  >
                    {post.category || 'Tech Talk Hub'}
                  </span>
                  <h3 className="mt-4 text-xl leading-snug font-black text-[#2947C7]">
                    <Link to={href}>{post.title}</Link>
                  </h3>
                  {post.excerpt && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <Link
                      to={href}
                      className="inline-flex items-center gap-2 text-sm font-black text-[#FF3F7F]"
                    >
                      Read story
                      <ArrowRight size={15} />
                    </Link>
                    <span className="text-xs text-slate-400">
                      {formatPostDate(
                        post.published_at || post.created_at,
                        'long',
                      )}
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
