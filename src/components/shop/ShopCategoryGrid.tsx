import { CATEGORY_ICONS } from '../../data/shop'

type ShopCategoryGridProps = {
  categories: string[]
  activeCategory: string
  countFor: (category: string) => number
  onSelect: (category: string) => void
}

export function ShopCategoryGrid({
  categories,
  activeCategory,
  countFor,
  onSelect,
}: ShopCategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {categories.map((category, index) => {
        const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]
        const count = countFor(category)

        return (
          <button
            type="button"
            key={category}
            onClick={() => onSelect(category)}
            aria-pressed={activeCategory === category}
            className={`flex min-h-[76px] items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
              activeCategory === category
                ? 'border-[#8061eb] ring-2 ring-purple-100'
                : 'border-[#e7e8ef]'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1ecff] text-[#6944e6]">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold">{category}</p>
              <p className="mt-1 text-[10px] text-[#8690a7]">
                {count} {count === 1 ? 'Product' : 'Products'}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
