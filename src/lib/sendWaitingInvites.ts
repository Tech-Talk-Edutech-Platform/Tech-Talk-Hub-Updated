import { apiUrl } from './apiUrl'

/**
 * After a family books a trial on the website: asks the server to email the
 * classroom links waiting to go out (server/routes/trialInvites.ts). Best
 * effort; the server's scheduled run catches anything this misses.
 */
export function sendWaitingInvites(): void {
  void fetch(apiUrl('/api/trials/send-pending'), {
    method: 'POST',
    keepalive: true,
  }).catch(() => undefined)
}
