/** Up to two initials in a round tile, for people without a photo. */
export function Initials({ name, size = 32 }: { name: string; size?: number }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-black text-purple-700 dark:bg-purple-500/20 dark:text-purple-200"
    >
      {letters || '?'}
    </span>
  )
}
