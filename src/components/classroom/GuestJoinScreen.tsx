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
    <main className="grid min-h-dvh place-items-center px-4 py-8 hero-base-gradient">
      <form
        onSubmit={submit}
        className="w-full max-w-[440px] rounded-[20px] border border-line bg-white/95 p-8 shadow-[0_24px_60px_-24px_rgb(63_81_181/0.35)] backdrop-blur-sm max-sm:p-6"
      >
        <div className="flex items-center gap-3">
          <BrandMark size={44} />
          <div>
            <span className="block text-[19px] leading-6 font-extrabold tracking-tight text-brand">
              {CLASSROOM_BRAND.name}
            </span>
            <span className="block text-[11px] font-medium tracking-wide text-muted">
              Think. Code. Create.
            </span>
          </div>
        </div>
        <h1 className="mt-7 text-[26px] leading-8 font-extrabold tracking-[-0.02em] text-ink">
          Join the <span className="text-accent-pink-strong">classroom</span>
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
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- this screen exists only to take the name
          autoFocus
          maxLength={80}
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value)
            setError(null)
          }}
          placeholder="Enter your name"
          className="mt-2 h-12 w-full rounded-[12px] border border-line bg-surface-2/60 px-4 text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
        />
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-danger-ink">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-accent-pink-strong px-4 text-[15px] font-bold text-white shadow-lg shadow-accent-pink/20 hover:bg-accent-pink-hover"
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
