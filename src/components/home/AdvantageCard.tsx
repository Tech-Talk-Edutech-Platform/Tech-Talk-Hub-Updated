import type { IconFeature } from '../../types/content'

type AdvantageCardProps = {
  feature: IconFeature
}

export function AdvantageCard({
  feature: { icon: Icon, title, description },
}: AdvantageCardProps) {
  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-7 text-center shadow-[0_12px_35px_rgba(30,41,59,0.07)] transition duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-[0_18px_45px_rgba(41,71,199,0.10)]">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-primary">
        <Icon className="h-7 w-7" strokeWidth={2} />
      </span>

      <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  )
}
