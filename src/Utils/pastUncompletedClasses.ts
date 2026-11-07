import { supabase } from '../supabase'

/**
 * Fetches the count of classes that have already happened
 * but are not yet marked as completed/reviewed.
 * @param {string} tutorId - The UUID of the tutor
 * @returns {Promise<number>} - The count of pending class reviews
 */
export const getPendingClassReviewsCount = async (
  tutorId: string | null | undefined,
): Promise<number> => {
  if (!tutorId) return 0

  try {
    const now = new Date().toISOString()

    const { count, error } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', tutorId)
      .lt('scheduled_at', now) // Class is in the past
      .eq('completed', false) // But report/review isn't done

    if (error) {
      console.error('Error fetching class review count:', error.message)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('System error in class reviews:', err)
    return 0
  }
}
