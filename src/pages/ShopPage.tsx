import { Loader2, PackageSearch, Search } from 'lucide-react'

import { NavBar } from '../components/layout/NavBar'
import { ShopBenefits } from '../components/shop/ShopBenefits'
import { ShopCategoryGrid } from '../components/shop/ShopCategoryGrid'
import { ShopHero } from '../components/shop/ShopHero'
import { ShopProductCard } from '../components/shop/ShopProductCard'
import { staticPageMeta } from '../data/seo'
import { MAX_CATEGORY_TILES } from '../data/shop'
import { useFavorites } from '../hooks/useFavorites'
import { usePageMeta } from '../hooks/usePageMeta'
import { useShopCatalog } from '../hooks/useShopCatalog'
import { useShopProducts } from '../hooks/useShopProducts'

const PRODUCTS_SECTION_ID = 'products'

export function ShopPage() {
  usePageMeta(staticPageMeta('/shop'))
  const productsQuery = useShopProducts()
  const products = productsQuery.data ?? []
  const catalog = useShopCatalog(products)
  const { isFavorite, toggleFavorite } = useFavorites()

  function showAllProducts() {
    catalog.resetFilters()
    window.setTimeout(() => {
      document
        .getElementById(PRODUCTS_SECTION_ID)
        ?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  return (
    <main className="min-h-screen bg-[#fafafe] text-[#101936]">
      <NavBar />

      <ShopHero onShopProducts={showAllProducts} />

      <ShopBenefits />

      <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <div className="relative">
            <Search
              size={18}
              className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={catalog.search}
              onChange={(event) => catalog.setSearch(event.target.value)}
              placeholder="Search books, kits, resources..."
              aria-label="Search products"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-4 pl-11 text-sm text-slate-700 shadow-sm transition outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/60"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Shop by Category</h2>
          <button
            type="button"
            onClick={showAllProducts}
            className="text-[12px] font-bold text-[#5c36df]"
          >
            View All
          </button>
        </div>

        {catalog.categories.length > 1 && (
          <ShopCategoryGrid
            categories={catalog.categories.slice(1, MAX_CATEGORY_TILES + 1)}
            activeCategory={catalog.activeCategory}
            countFor={(category) =>
              products.filter((product) => product.category === category).length
            }
            onSelect={catalog.selectCategory}
          />
        )}
      </section>

      <section
        id={PRODUCTS_SECTION_ID}
        className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-10 pb-16 sm:px-6 lg:px-8"
      >
        {productsQuery.isPending ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-black">{catalog.heading}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {catalog.displayedProducts.length}{' '}
                  {catalog.displayedProducts.length === 1
                    ? 'product'
                    : 'products'}
                </p>
              </div>
              <button
                type="button"
                onClick={showAllProducts}
                className="text-xs font-bold text-primary"
              >
                View All Products
              </button>
            </div>

            {catalog.displayedProducts.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white">
                <PackageSearch size={30} className="text-purple-300" />
                <p className="mt-4 font-bold">No products found</p>
                {catalog.isFiltered && (
                  <button
                    type="button"
                    onClick={showAllProducts}
                    className="mt-3 text-xs font-bold text-primary"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {catalog.displayedProducts.map((product) => (
                  <ShopProductCard
                    key={product.id}
                    product={product}
                    favorite={isFavorite(product.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
