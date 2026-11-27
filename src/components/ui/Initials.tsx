import type { AppRole } from '../../types/roles'

type InitialsProps = {
  name: string
  size?: number
  /** Colours the tile by role, so students, tutors and staff read apart. */
  userRole?: AppRole | null
}

const ROLE_TONE: Record<AppRole, string> = {
  student: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-200',
  tutor:
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
  owner: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  operations_admin:
    'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  tech_admin: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  marketer:
    'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
}
const DEFAULT_TONE =
  'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200'

/** Up to two initials in a round tile, for people without a photo. */
export function Initials({ name, size = 32, userRole }: InitialsProps) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.36)),
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-black ${
        userRole ? ROLE_TONE[userRole] : DEFAULT_TONE
      }`}
    >
      {letters || '?'}
    </span>
  )
}
