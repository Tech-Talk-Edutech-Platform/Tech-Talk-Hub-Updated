import { getCategoryStyle } from '../../lib/blog'

type CategoryBadgeProps = {
  category: string | null
  showDot?: boolean
}

export function CategoryBadge({
  category,
  showDot = true,
}: CategoryBadgeProps) {
  const style = getCategoryStyle(category ?? '')

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black tracking-[0.12em] uppercase ${style.background} ${style.text} ${style.border}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />}
      {category || 'Tech Talk Hub'}
    </span>
  )
}
