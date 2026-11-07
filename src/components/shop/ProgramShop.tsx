import { useMemo, useState } from 'react'
import { Loader2, PackageSearch, Search } from 'lucide-react'

import { useShopProducts } from '../../hooks/useShopProducts'
import { ProgramShopProductCard } from './ProgramShopProductCard'

const ALL = 'All'

type ProgramShopProps = {
  program: string
  title: string
  subtitle: string
  searchPlaceholder: string
}

/** One program's products with search and category filters. */
export function ProgramShop({
  program,
  title,
  subtitle,
  searchPlaceholder,
}: ProgramShopProps) {
  const productsQuery = useShopProducts(program)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(ALL)

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const categories = useMemo(
    () => [
      ALL,
      ...new Set(products.map((product) => product.category).filter(Boolean)),
    ],
    [products],
  )

  const query = search.trim().toLowerCase()
  const filteredProducts = products.filter(
    (product) =>
      (activeCategory === ALL || product.category === activeCategory) &&
      (!query ||
        [product.name, product.short_description, product.category].some(
          (field) => field?.toLowerCase().includes(query),
        )),
  )

  return (
    <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-secondary uppercase">
            {title}
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">
            {subtitle}
          </h2>
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            size={16}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-11 text-sm transition outline-none focus:border-primary"
          />
        </div>
      </div>

      {categories.length > 1 && (
        <div className="mb-9 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => setActiveCategory(category)}
              aria-pressed={activeCategory === category}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                activeCategory === category
                  ? 'bg-primary text-white shadow-md'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-purple-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {productsQuery.isPending ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
          <PackageSearch className="h-10 w-10 text-slate-300" />
          <h3 className="mt-4 text-lg font-bold text-slate-800">
            Products coming soon
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            We&apos;re preparing more learning resources.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProgramShopProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
