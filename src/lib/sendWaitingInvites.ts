import { apiUrl } from './apiUrl'
import { supabase } from '../supabase'

/** Staff can prompt delivery after assigning a trial. Public bookings use the scheduled sweep. */
export function sendWaitingInvites(): void {
  void supabase.auth
    .getSession()
    .then(({ data }) => {
      const token = data.session?.access_token
      if (!token) return undefined
      return fetch(apiUrl('/api/trials/send-pending'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      })
    })
    .catch(() => undefined)
}
