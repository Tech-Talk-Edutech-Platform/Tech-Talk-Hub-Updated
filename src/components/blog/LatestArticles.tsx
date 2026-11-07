import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ALL_STORIES } from '../../lib/blog'
import type { BlogPostSummary } from '../../types/blog'
import { ArticleCard } from './ArticleCard'

type LatestArticlesProps = {
  posts: BlogPostSummary[]
  selectedCategory: string
}

export function LatestArticles({
  posts,
  selectedCategory,
}: LatestArticlesProps) {
  if (posts.length === 0) {
    return null
  }

  return (
    <section className="border-y border-purple-50 bg-[#FCFAFF] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-[#FF3F7F] uppercase">
              Keep exploring
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#2947C7] sm:text-4xl">
              More stories and ideas.
            </h2>
          </div>

          {selectedCategory !== ALL_STORIES && (
            <Link
              to="/blog#latest-stories"
              className="inline-flex items-center gap-2 text-sm font-black text-[#7651EF]"
            >
              View all stories
              <ArrowRight size={16} />
            </Link>
          )}
        </div>

        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <ArticleCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  )
}
