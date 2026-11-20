import { supabase } from '../supabase'

export async function notifyDashboardTutor(tutorId: string, message: string) {
  const { error } = await supabase.functions.invoke('send-push', {
    body: { tutor_id: tutorId, title: 'Class Update', body: message },
  })
  if (error) throw new Error('Could not notify the tutor.')
}
