import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useCart } from '../../hooks/useCart'
import { formatMoney } from '../../lib/money'
import { productHref } from '../../lib/shop'
import type { CartItem } from '../../types/cart'

type CartLineItemProps = {
  item: CartItem
}

export function CartLineItem({ item }: CartLineItemProps) {
  const { updateQuantity, removeFromCart } = useCart()

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShoppingBag className="text-slate-300" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          to={productHref(item.slug)}
          className="font-bold text-slate-900 hover:text-primary"
        >
          {item.name}
        </Link>
        <p className="mt-2 text-base font-black text-primary">
          {formatMoney(item.price, item.currency)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <div className="flex items-center rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            aria-label={`Reduce quantity of ${item.name}`}
            className="p-2"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[38px] text-center text-sm font-bold">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            aria-label={`Increase quantity of ${item.name}`}
            className="p-2"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => removeFromCart(item.id)}
          aria-label={`Remove ${item.name} from cart`}
          className="text-slate-400 hover:text-red-500"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  )
}
