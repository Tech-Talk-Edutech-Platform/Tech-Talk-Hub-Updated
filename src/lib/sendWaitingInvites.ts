import { apiUrl } from './apiUrl'

/**
 * After a family books a trial on the website, or staff assign one: asks the
 * server to email the classroom links waiting to go out
 * (server/routes/trialInvites.ts). Works signed out, so website bookings get
 * their invite. Best effort; a scheduled run catches anything this misses.
 */
export function sendWaitingInvites(): void {
  void fetch(apiUrl('/api/trials/send-pending'), {
    method: 'POST',
    keepalive: true,
  }).catch(() => undefined)
}
