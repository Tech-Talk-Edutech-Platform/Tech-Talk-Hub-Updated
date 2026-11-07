import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'

import { requestRoadmap } from '../../lib/api/roadmap'

type LeadMagnetFormProps = {
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success'
const leadMagnetSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
})
type LeadMagnetValues = z.infer<typeof leadMagnetSchema>

/** Collects a parent's email to send them the curriculum roadmap PDF. */
export function LeadMagnetForm({ onClose }: LeadMagnetFormProps) {
  const [status, setStatus] = useState<Status>('idle')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadMagnetValues>({
    resolver: zodResolver(leadMagnetSchema),
    defaultValues: { email: '' },
  })

  async function submit({ email }: LeadMagnetValues) {
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

  return (
    <form
      onSubmit={(event) => void handleSubmit(submit)(event)}
      noValidate
      className="flex flex-col gap-3"
    >
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
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-red-600">
              {errors.email.message}
            </p>
          )}

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
