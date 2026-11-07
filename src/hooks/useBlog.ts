import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  fetchBlogPost,
  fetchBlogPosts,
  fetchRelatedPosts,
} from '../lib/api/blog'
import { queryKeys } from '../lib/queryClient'
import type { BlogPost } from '../types/blog'

/** Published posts for a category; keeps showing the previous list while switching. */
export function useBlogPosts(category: string) {
  return useQuery({
    queryKey: queryKeys.site.blogPosts(category),
    queryFn: () => fetchBlogPosts(category),
    placeholderData: keepPreviousData,
  })
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: queryKeys.site.blogPost(slug),
    queryFn: () => fetchBlogPost(slug),
  })
}

export function useRelatedPosts(post: BlogPost | null | undefined) {
  return useQuery({
    queryKey: queryKeys.site.relatedPosts(post?.id ?? ''),
    queryFn: () => (post ? fetchRelatedPosts(post) : []),
    enabled: Boolean(post),
  })
}
