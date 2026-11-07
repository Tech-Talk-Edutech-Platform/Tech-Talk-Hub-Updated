import { apiUrl } from '../apiUrl'

/** Asks the backend to email the curriculum roadmap PDF to a parent. */
export async function requestRoadmap(email: string): Promise<void> {
  const response = await fetch(apiUrl('/api/send-curriculum'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(`Roadmap request failed with status ${response.status}`)
  }
}
