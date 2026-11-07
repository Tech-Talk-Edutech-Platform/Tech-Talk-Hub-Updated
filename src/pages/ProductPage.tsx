import { CheckCircle2, ChevronLeft, Heart, Loader2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { NavBar } from '../components/layout/NavBar'
import { JsonLd } from '../components/seo/JsonLd'
import { ProductGallery } from '../components/shop/ProductGallery'
import { ProductPurchaseControls } from '../components/shop/ProductPurchaseControls'
import { TrustItem } from '../components/shop/TrustItem'
import { PRODUCT_TRUST_POINTS } from '../data/shop'
import { useFavorites } from '../hooks/useFavorites'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProduct } from '../hooks/useShopProducts'
import { formatMoney } from '../lib/money'
import { isInStock } from '../lib/shop'
import { productPageMeta, productSchema } from '../lib/structuredData'
import { NotFoundPage } from './NotFoundPage'

/** `/shop/:slug` */
export function ProductPage() {
  const { slug = '' } = useParams()
  const productQuery = useProduct(slug)
  const product = productQuery.data
  const { isFavorite, toggleFavorite } = useFavorites()

  usePageMeta(product ? productPageMeta(product) : null)

  if (productQuery.isPending) {
    return (
      <main className="min-h-screen bg-[#fafafe]">
        <NavBar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    )
  }

  if (!product) {
    return <NotFoundPage />
  }

  const favorite = isFavorite(product.id)

  return (
    <main className="min-h-screen bg-[#fafafe]">
      <JsonLd data={productSchema(product)} />
      <NavBar />

      <section className="pt-[100px]">
        <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"
            >
              <ChevronLeft size={16} />
              Back to Shop
            </Link>
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              aria-pressed={favorite}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm"
            >
              <Heart
                size={16}
                className={favorite ? 'fill-[#ff4b7c] text-[#ff4b7c]' : ''}
              />
              {favorite ? 'Saved' : 'Save'}
            </button>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <ProductGallery key={product.id} product={product} />

              <div className="p-6 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  {product.category && (
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-[9px] font-black tracking-wider text-primary uppercase">
                      {product.category}
                    </span>
                  )}
                  {product.program && product.program !== 'general' && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                      {product.program.replaceAll('-', ' ')}
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-3xl leading-tight font-black tracking-tight text-[#101936] sm:text-4xl">
                  {product.name}
                </h1>

                {product.short_description && (
                  <p className="mt-4 text-sm leading-7 text-slate-500">
                    {product.short_description}
                  </p>
                )}

                <div className="mt-6 rounded-2xl bg-[#faf9ff] p-5">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl font-black text-primary">
                      {formatMoney(product.price, product.currency)}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-sm font-semibold text-slate-400 line-through">
                        {formatMoney(
                          product.compare_at_price,
                          product.currency,
                        )}
                      </span>
                    )}
                  </div>

                  {isInStock(product) ? (
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600">
                      <CheckCircle2 size={15} />
                      Available to order
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-bold text-red-500">
                      Currently unavailable
                    </p>
                  )}
                </div>

                <div className="mt-7">
                  <ProductPurchaseControls key={product.id} product={product} />
                </div>

                <div className="mt-8 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
                  {PRODUCT_TRUST_POINTS.map((point) => (
                    <TrustItem key={point.title} {...point} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black text-[#101936]">
              Product Details
            </h2>
            {product.description ? (
              <p className="mt-4 max-w-4xl text-sm leading-7 whitespace-pre-line text-slate-600">
                {product.description}
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                More product information coming soon.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
