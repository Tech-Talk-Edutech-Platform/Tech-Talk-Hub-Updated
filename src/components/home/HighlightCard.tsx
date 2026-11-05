import type { HighlightFeature } from '../../types/content'

type HighlightCardProps = {
  highlight: HighlightFeature
}

export function HighlightCard({
  highlight: { icon: Icon, iconClassName, title, description },
}: HighlightCardProps) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-md shadow-purple-900/5 backdrop-blur">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}
      >
        <Icon className="h-5 w-5" />
      </span>

      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}
