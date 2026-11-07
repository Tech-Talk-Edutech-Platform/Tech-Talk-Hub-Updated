import { AGE_GROUP_CARDS } from '../../../data/blog'

export function AgeGroupCards() {
  return (
    <div className="my-8 grid gap-4 sm:grid-cols-3">
      {AGE_GROUP_CARDS.map((group) => {
        const Icon = group.icon

        return (
          <div
            key={group.title}
            className={`rounded-[1.5rem] border bg-gradient-to-br p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${group.background} ${group.border ?? ''}`}
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${group.iconBackground} ${group.iconColor}`}
            >
              <Icon size={21} />
            </span>
            <h3 className="mt-4 text-lg font-black text-[#172554]">
              {group.title}
            </h3>
            <p className={`mt-1 text-xs font-bold ${group.iconColor}`}>
              {group.subtitle}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {group.description}
            </p>
          </div>
        )
      })}
    </div>
  )
}
