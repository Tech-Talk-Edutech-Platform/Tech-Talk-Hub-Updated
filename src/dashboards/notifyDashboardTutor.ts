import { supabase } from '../supabase'
import { apiUrl } from '../lib/apiUrl'

export async function notifyDashboardTutor(tutorId: string, message: string) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sign in to notify tutors.')
  const response = await fetch(apiUrl('/api/push'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tutor_id: tutorId, body: message }),
  })
  const result: { success?: boolean; error?: string } | null = await response
    .json()
    .catch(() => null)
  if (!response.ok || result?.success !== true)
    throw new Error(result?.error ?? 'Could not notify the tutor.')
}
