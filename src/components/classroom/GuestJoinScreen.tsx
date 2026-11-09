import { useState, type FormEvent } from 'react'
import { ArrowRight, Video } from 'lucide-react'
import { CLASSROOM_BRAND } from '../../data/classroomBrand'
import { BrandMark } from './brand/BrandMark'

type GuestJoinScreenProps = {
  roomTitle: string
  onJoin: (name: string) => void
}

export function GuestJoinScreen({ roomTitle, onJoin }: GuestJoinScreenProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const displayName = name.trim()
    if (!displayName) {
      setError('Enter your name to join the call.')
      return
    }
    if (displayName.length > 80) {
      setError('Your name must be 80 characters or fewer.')
      return
    }
    onJoin(displayName)
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-surface-2 px-4 py-8">
      <form
        onSubmit={submit}
        className="w-full max-w-[440px] rounded-[10px] bg-white p-8 shadow-[0_16px_48px_-20px_rgb(0_0_0/0.22)] max-sm:p-6"
      >
        <div className="flex items-center gap-3">
          <BrandMark size={42} radius={5} />
          <span className="text-[19px] font-semibold text-ink">
            {CLASSROOM_BRAND.name}
          </span>
        </div>
        <h1 className="mt-7 text-[24px] font-semibold text-ink">
          Join the classroom
        </h1>
        <p className="mt-2 text-[14px] leading-5 text-muted">{roomTitle}</p>

        <label
          htmlFor="guest-display-name"
          className="mt-6 block text-[14px] font-medium text-ink"
        >
          Your name
        </label>
        <input
          id="guest-display-name"
          autoComplete="name"
          autoFocus
          maxLength={80}
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value)
            setError(null)
          }}
          placeholder="Enter your name"
          className="mt-2 h-11 w-full rounded-[4px] border border-line px-3 text-[15px] text-ink outline-none focus:border-brand"
        />
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-brand">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="press hover:bg-brand-hover mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-brand px-4 text-[15px] font-semibold text-white"
        >
          <Video size={18} aria-hidden="true" />
          Join call
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        <p className="mt-4 text-center text-[12.5px] leading-[18px] text-muted">
          Your camera and microphone start off. You can turn them on after you
          join.
        </p>
      </form>
    </main>
  )
}
