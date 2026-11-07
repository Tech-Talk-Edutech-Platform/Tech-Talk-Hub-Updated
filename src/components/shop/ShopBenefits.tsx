import { SHOP_BENEFITS } from '../../data/shop'

/** The strip of shop promises under the hero. */
export function ShopBenefits() {
  return (
    <section className="relative z-10 -mt-4">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-2xl border border-[#ededf3] bg-white shadow-[0_8px_25px_rgba(23,32,70,0.06)] sm:grid-cols-2 lg:grid-cols-5">
          {SHOP_BENEFITS.map(({ icon: Icon, title, subtitle }, index) => (
            <div
              key={title}
              className={`flex min-h-[88px] items-center gap-3 px-5 py-4 ${
                index < SHOP_BENEFITS.length - 1
                  ? 'border-b border-[#eeeeF4] sm:border-r lg:border-b-0'
                  : ''
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f0ff] text-[#6442e4]">
                <Icon size={18} />
              </div>
              <div>
                <div className="text-[11px] font-extrabold">{title}</div>
                <div className="mt-1 text-[10px] text-[#758099]">
                  {subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
