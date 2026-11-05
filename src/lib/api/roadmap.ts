/**
 * Asks the backend to email the curriculum roadmap PDF to a parent.
 *
 * NOTE: this endpoint was a Next.js API route (Resend) in the old website and
 * has no backend in this app yet.
 */
export async function requestRoadmap(email: string): Promise<void> {
  await fetch('/api/send-curriculum', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}
