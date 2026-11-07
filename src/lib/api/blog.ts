import type { BlogPost, BlogPostSummary } from '../../types/blog'
import { ALL_STORIES } from '../blog'
import { getSupabase } from '../supabase'

const SUMMARY_COLUMNS =
  'id, slug, title, excerpt, content, category, cover_image_url, published_at, created_at'

/** Published posts, newest first; pass a category to filter. */
export async function fetchBlogPosts(
  category: string = ALL_STORIES,
): Promise<BlogPostSummary[]> {
  let query = getSupabase()
    .from('blog_posts')
    .select(SUMMARY_COLUMNS)
    .eq('status', 'published')

  if (category !== ALL_STORIES) {
    query = query.eq('category', category)
  }

  const { data, error } = await query.order('published_at', {
    ascending: false,
    nullsFirst: false,
  })

  if (error) {
    throw error
  }

  return data
}

/** A published post by slug, or `null` when there's none. */
export async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  const { data, error } = await getSupabase()
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function fetchRecentPosts(
  excludeId: string,
  category?: string,
): Promise<BlogPostSummary[]> {
  let query = getSupabase()
    .from('blog_posts')
    .select(SUMMARY_COLUMNS)
    .eq('status', 'published')
    .neq('id', excludeId)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3)

  if (error) {
    throw error
  }

  return data
}

/**
 * Up to three posts to read next: others in the same category, or the most
 * recent posts when the category has none. Resolves to `[]` on failure.
 */
export async function fetchRelatedPosts(
  post: Pick<BlogPost, 'id' | 'category'>,
): Promise<BlogPostSummary[]> {
  try {
    if (post.category) {
      const sameCategory = await fetchRecentPosts(post.id, post.category)

      if (sameCategory.length > 0) {
        return sameCategory
      }
    }

    return await fetchRecentPosts(post.id)
  } catch (error) {
    console.error('Failed to fetch related articles:', error)
    return []
  }
}
