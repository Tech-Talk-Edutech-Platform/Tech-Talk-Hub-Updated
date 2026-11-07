import { BookOpen } from 'lucide-react'

import type { BlogPostSummary } from '../../types/blog'
import { FillImage } from '../ui/FillImage'

type BlogCoverImageProps = {
  post: BlogPostSummary
  priority?: boolean
  sizes?: string
}

/** A post's cover image filling its frame, or a branded placeholder. */
export function BlogCoverImage({
  post,
  priority = false,
  sizes = '100vw',
}: BlogCoverImageProps) {
  if (!post.cover_image_url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F6F2FF] via-[#EDF3FF] to-[#FFF1F5]">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#7651EF] shadow-sm">
            <BookOpen size={26} />
          </span>
          <p className="mt-4 text-xs font-black tracking-[0.16em] text-[#2947C7] uppercase">
            Tech Talk Hub
          </p>
        </div>
      </div>
    )
  }

  return (
    <FillImage
      src={post.cover_image_url}
      alt={post.title || 'Tech Talk Hub article'}
      priority={priority}
      sizes={sizes}
      className="object-contain transition duration-500 group-hover:scale-[1.025]"
    />
  )
}
