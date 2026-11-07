import { CODING_BENEFIT_CARDS } from '../../../data/blog'

export function BenefitsCards() {
  return (
    <div className="my-8 grid gap-4 sm:grid-cols-2">
      {CODING_BENEFIT_CARDS.map((benefit) => {
        const Icon = benefit.icon

        return (
          <div
            key={benefit.title}
            className={`rounded-[1.4rem] p-5 transition hover:-translate-y-0.5 hover:shadow-md ${benefit.background}`}
          >
            <div className="flex items-start gap-4">
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${benefit.iconBackground} ${benefit.iconColor}`}
              >
                <Icon size={21} />
              </span>
              <div>
                <h3 className="text-base font-black text-[#172554]">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {benefit.description}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
