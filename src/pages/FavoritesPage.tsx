import { useState } from 'react'
import { ChevronLeft, Heart, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { NavBar } from '../components/layout/NavBar'
import { FavoriteProductCard } from '../components/shop/FavoriteProductCard'
import { staticPageMeta } from '../data/seo'
import { useFavorites } from '../hooks/useFavorites'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProductsByIds } from '../hooks/useShopProducts'
import { readFavoriteIds } from '../lib/favorites'

export function FavoritesPage() {
  usePageMeta(staticPageMeta('/favorites'))
  const { favoriteIds, removeFavorite } = useFavorites()
  // Load the products saved when the page opened; removing one hides it
  // without refetching the rest.
  const [savedIds] = useState(readFavoriteIds)
  const productsQuery = useProductsByIds(savedIds)
  const products = (productsQuery.data ?? []).filter((product) =>
    favoriteIds.includes(product.id),
  )

  return (
    <main className="min-h-screen bg-[#fafafe]">
      <NavBar />

      <section className="pt-[105px]">
        <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:px-8">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"
          >
            <ChevronLeft size={16} />
            Continue Shopping
          </Link>

          <div className="mt-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-[#ff4b7c]">
                <Heart size={20} className="fill-[#ff4b7c]" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-[#101936]">
                  My Favorites
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Products you&apos;ve saved for later.
                </p>
              </div>
            </div>
          </div>

          {productsQuery.isPending ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="mt-10 flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 text-center">
              <Heart className="h-12 w-12 text-slate-200" />
              <h2 className="mt-5 text-xl font-black">No favorites yet</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Tap the heart on a product to save it here.
              </p>
              <Link
                to="/shop"
                className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
              >
                Explore Shop
              </Link>
            </div>
          ) : (
            <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => (
                <FavoriteProductCard
                  key={product.id}
                  product={product}
                  onRemove={removeFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
