import { useState, type FormEvent } from 'react'

import { requestRoadmap } from '../../lib/api/roadmap'

type LeadMagnetFormProps = {
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success'

/** Collects a parent's email to send them the curriculum roadmap PDF. */
export function LeadMagnetForm({ onClose }: LeadMagnetFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function submit() {
    setStatus('loading')

    try {
      await requestRoadmap(email)
    } catch (error) {
      console.error('Failed to request roadmap:', error)
      setStatus('idle')
      return
    }

    setStatus('success')
    setTimeout(onClose, 3000)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {status === 'success' ? (
        <p className="text-center font-bold text-green-600">
          Thanks! Check your email for the PDF.
        </p>
      ) : (
        <>
          <input
            type="email"
            aria-label="Parent email"
            placeholder="Enter parent email"
            className="rounded-lg border border-slate-200 p-3"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-lg bg-slate-800 p-3 font-bold text-white hover:bg-slate-900"
          >
            {status === 'loading' ? 'Sending...' : 'Get Roadmap PDF'}
          </button>
        </>
      )}
    </form>
  )
}
