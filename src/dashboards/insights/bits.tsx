const PASS_MARK = 70

/** Score badge coloured against the pass mark. */
export function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-400">—</span>
  const tone =
    score >= 85
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
      : score >= PASS_MARK
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${tone}`}
    >
      {score}%
    </span>
  )
}

/** Thin percentage bar; `null` means not applicable. */
export function ProgressBar({
  value,
  showLabel = true,
}: {
  value: number | null
  showLabel?: boolean
}) {
  if (value === null) return <span className="text-slate-400">—</span>
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-2">
      <progress
        value={clamped}
        max={100}
        aria-label={showLabel ? undefined : `${clamped}%`}
        className="mt-1.5 h-1.5 w-full min-w-16 appearance-none overflow-hidden rounded-full bg-slate-100 dark:bg-white/10 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-purple-600 dark:[&::-moz-progress-bar]:bg-purple-400 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-purple-600 dark:[&::-webkit-progress-value]:bg-purple-400"
      />
      {showLabel && (
        <span className="w-9 shrink-0 text-right text-xs font-bold text-slate-700 tabular-nums dark:text-slate-200">
          {clamped}%
        </span>
      )}
    </div>
  )
}

/** Profile photo, or initials when there is none. */
export function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="size-9 shrink-0 rounded-full object-cover"
      />
    )
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-500/20 dark:text-purple-200"
    >
      {initials || '?'}
    </span>
  )
}
