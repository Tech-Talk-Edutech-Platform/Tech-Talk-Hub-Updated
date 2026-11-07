import { Code2, Heart, Minus, Plus, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useCart } from '../../hooks/useCart'
import { formatMoney } from '../../lib/money'
import { isInStock, productHref } from '../../lib/shop'
import type { ShopProduct } from '../../types/shop'

type FavoriteProductCardProps = {
  product: ShopProduct
  onRemove: (productId: string) => void
}

export function FavoriteProductCard({
  product,
  onRemove,
}: FavoriteProductCardProps) {
  const { addToCart, incrementItem, decrementItem, getItemQuantity } = useCart()
  const quantity = getItemQuantity(product.id)
  const inStock = isInStock(product)
  const href = productHref(product.slug)

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          aria-label={`Remove ${product.name} from favorites`}
          className="absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow"
        >
          <Heart size={16} className="fill-[#ff4b7c] text-[#ff4b7c]" />
        </button>

        <Link to={href}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-900">
              <Code2 className="text-purple-300" />
            </div>
          )}
        </Link>
      </div>

      <div className="p-4">
        <p className="text-[8px] font-black tracking-wider text-purple-500 uppercase">
          {product.category}
        </p>
        <Link to={href}>
          <h2 className="mt-1.5 line-clamp-2 min-h-[38px] text-xs leading-5 font-bold text-slate-800">
            {product.name}
          </h2>
        </Link>
        <p className="mt-3 text-sm font-black text-primary">
          {formatMoney(product.price, product.currency)}
        </p>

        <div className="mt-4">
          {quantity > 0 ? (
            <div className="flex h-10 items-center justify-between rounded-xl border border-purple-200 bg-purple-50">
              <button
                type="button"
                onClick={() => decrementItem(product.id)}
                aria-label={`Reduce quantity of ${product.name}`}
                className="flex h-full w-10 items-center justify-center text-primary"
              >
                <Minus size={14} />
              </button>
              <span className="text-xs font-black text-primary">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => incrementItem(product.id)}
                aria-label={`Increase quantity of ${product.name}`}
                className="flex h-full w-10 items-center justify-center text-primary"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!inStock}
              onClick={() => addToCart(product, 1)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[10px] font-bold text-white disabled:bg-slate-200"
            >
              <ShoppingCart size={14} />
              {inStock ? 'Add to Cart' : 'Unavailable'}
            </button>
          )}
        </div>

        <Link
          to={href}
          className="mt-3 block text-center text-[10px] font-bold text-slate-500 hover:text-primary"
        >
          View Details →
        </Link>
      </div>
    </article>
  )
}
