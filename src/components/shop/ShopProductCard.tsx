import { Code2, Heart, Minus, Plus, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useCart } from '../../hooks/useCart'
import { formatMoney } from '../../lib/money'
import { isAtStockLimit, isInStock, productHref } from '../../lib/shop'
import type { ShopProduct } from '../../types/shop'

type ShopProductCardProps = {
  product: ShopProduct
  favorite: boolean
  onToggleFavorite: (productId: string) => void
}

export function ShopProductCard({
  product,
  favorite,
  onToggleFavorite,
}: ShopProductCardProps) {
  const { addToCart, incrementItem, decrementItem, getItemQuantity } = useCart()
  const quantity = getItemQuantity(product.id)
  const inStock = isInStock(product)
  const href = productHref(product.slug)

  return (
    <article className="group flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_3px_14px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl">
      <div className="flex w-full flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {product.badge && (
            <span className="absolute top-2.5 left-2.5 z-10 rounded-full bg-[#ff4b7c] px-2 py-1 text-[8px] font-black text-white uppercase">
              {product.badge}
            </span>
          )}

          <button
            type="button"
            onClick={() => onToggleFavorite(product.id)}
            aria-label={
              favorite
                ? `Remove ${product.name} from favorites`
                : `Add ${product.name} to favorites`
            }
            aria-pressed={favorite}
            className="absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow"
          >
            <Heart
              size={16}
              className={favorite ? 'fill-[#ff4b7c] text-[#ff4b7c]' : ''}
            />
          </button>

          <Link to={href} className="block h-full">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900">
                <Code2 className="text-purple-300" />
              </div>
            )}
          </Link>
        </div>

        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          {product.category && (
            <p className="text-[8px] font-black tracking-wider text-purple-500 uppercase">
              {product.category}
            </p>
          )}

          <Link to={href}>
            <h3 className="mt-1.5 line-clamp-2 min-h-[38px] text-[12px] leading-[1.5] font-bold text-[#1e2844] transition hover:text-primary sm:text-[13px]">
              {product.name}
            </h3>
          </Link>

          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="text-[14px] font-black text-primary sm:text-[15px]">
              {formatMoney(product.price, product.currency)}
            </span>
            {product.compare_at_price && (
              <span className="text-[9px] font-semibold text-slate-400 line-through">
                {formatMoney(product.compare_at_price, product.currency)}
              </span>
            )}
          </div>

          {!inStock && (
            <p className="mt-2 text-[9px] font-bold text-red-500">
              Out of Stock
            </p>
          )}

          <div className="mt-auto pt-4">
            {quantity > 0 ? (
              <div className="flex h-10 items-center justify-between overflow-hidden rounded-xl border border-purple-200 bg-purple-50">
                <button
                  type="button"
                  onClick={() => decrementItem(product.id)}
                  aria-label={`Reduce quantity of ${product.name}`}
                  className="flex h-full w-10 items-center justify-center text-primary transition hover:bg-purple-100"
                >
                  <Minus size={14} />
                </button>
                <div className="text-center">
                  <span className="block text-xs font-black text-primary">
                    {quantity}
                  </span>
                  <span className="hidden text-[8px] font-bold text-purple-400 uppercase sm:block">
                    In Cart
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => incrementItem(product.id)}
                  disabled={isAtStockLimit(product, quantity)}
                  aria-label={`Increase quantity of ${product.name}`}
                  className="flex h-full w-10 items-center justify-center text-primary transition hover:bg-purple-100 disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!inStock}
                onClick={() => addToCart(product, 1)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[10px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#4e2ec8] disabled:bg-slate-200 disabled:text-slate-400"
              >
                <ShoppingCart size={14} />
                {inStock ? 'Add to Cart' : 'Unavailable'}
              </button>
            )}

            <Link
              to={href}
              className="mt-2.5 block text-center text-[10px] font-bold text-slate-500 transition hover:text-primary"
            >
              View Details →
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
