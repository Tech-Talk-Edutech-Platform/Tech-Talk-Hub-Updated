import { supabase } from '../supabase'

/**
 * Fetches the count of assignments that are submitted but not yet reviewed.
 * Automatically detects the logged-in user if no tutorId is provided.
 */
export const getPendingAssignmentsCount = async (
  tutorId?: string | null,
): Promise<number> => {
  try {
    let activeId: string | null = tutorId ?? null

    // 1. If no ID is passed, grab it from the current active session
    if (!activeId) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) return 0
      activeId = user.id
    }

    // 2. Query the DB using the determined ID
    const { count, error } = await supabase
      .from('student_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', activeId)
      .eq('status', 'submitted')

    if (error) {
      console.error('Supabase Error (Assignments):', error.message)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('System Error (Assignments):', err)
    return 0
  }
}
