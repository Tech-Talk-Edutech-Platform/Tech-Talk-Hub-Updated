import type { Testimonial } from '../../types/testimonial'
import { getSupabase } from '../supabase'

/** The three published testimonials to feature. Resolves to `[]` on failure. */
export async function fetchTestimonials(): Promise<Testimonial[]> {
  try {
    const { data, error } = await getSupabase()
      .from('testimonials')
      .select(
        `
          id,
          parent_name,
          feedback,
          screenshot_url,
          source
        `,
      )
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(3)
      .overrideTypes<Testimonial[], { merge: false }>()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to fetch testimonials:', error)
    return []
  }
}
