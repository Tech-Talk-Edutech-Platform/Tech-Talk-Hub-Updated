import { Calendar, Clock3, Users } from 'lucide-react'

import { calculateReadingTime, formatPostDate } from '../../lib/blog'
import type { BlogPostSummary } from '../../types/blog'

type ArticleMetaProps = {
  post: BlogPostSummary
  showAuthor?: boolean
  compact?: boolean
}

/** Author, date and reading time under a post title. */
export function ArticleMeta({
  post,
  showAuthor = false,
  compact = false,
}: ArticleMetaProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${
        compact ? 'text-xs' : 'text-sm'
      } text-slate-500`}
    >
      {showAuthor && (
        <span className="inline-flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F0EBFF] text-[#7651EF]">
            <Users size={14} />
          </span>
          Tech Talk Hub
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Calendar size={compact ? 13 : 15} />
        {formatPostDate(post.published_at || post.created_at)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 size={compact ? 13 : 15} />
        {calculateReadingTime(post.content)} min read
      </span>
    </div>
  )
}
