import { useState } from 'react'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useCart } from '../../hooks/useCart'
import { isAtStockLimit, isInStock } from '../../lib/shop'
import type { ShopProduct } from '../../types/shop'

type ProductPurchaseControlsProps = {
  product: ShopProduct
}

/** Quantity picker + Add to Cart, or the in-cart stepper once the product is in the cart. */
export function ProductPurchaseControls({
  product,
}: ProductPurchaseControlsProps) {
  const { addToCart, incrementItem, decrementItem, getItemQuantity } = useCart()
  const [requestedQuantity, setRequestedQuantity] = useState(1)
  const cartQuantity = getItemQuantity(product.id)
  const inStock = isInStock(product)

  if (cartQuantity > 0) {
    return (
      <>
        <p className="mb-3 text-xs font-bold text-slate-500">
          Quantity in your cart
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex h-14 items-center overflow-hidden rounded-xl border border-purple-200 bg-purple-50">
            <button
              type="button"
              onClick={() => decrementItem(product.id)}
              aria-label="Decrease quantity"
              className="flex h-full w-14 items-center justify-center text-primary"
            >
              <Minus size={17} />
            </button>
            <span className="min-w-[55px] text-center text-sm font-black text-primary">
              {cartQuantity}
            </span>
            <button
              type="button"
              onClick={() => incrementItem(product.id)}
              disabled={isAtStockLimit(product, cartQuantity)}
              aria-label="Increase quantity"
              className="flex h-full w-14 items-center justify-center text-primary disabled:opacity-30"
            >
              <Plus size={17} />
            </button>
          </div>
          <Link
            to="/cart"
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-purple-200"
          >
            <ShoppingCart size={18} />
            View Cart
          </Link>
        </div>
      </>
    )
  }

  const atLimit = isAtStockLimit(product, requestedQuantity)

  return (
    <>
      <p className="mb-3 text-xs font-bold text-slate-500">Quantity</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-14 items-center overflow-hidden rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() =>
              setRequestedQuantity((value) => Math.max(1, value - 1))
            }
            aria-label="Decrease quantity"
            className="flex h-full w-14 items-center justify-center text-slate-500"
          >
            <Minus size={17} />
          </button>
          <span className="min-w-[55px] text-center text-sm font-black">
            {requestedQuantity}
          </span>
          <button
            type="button"
            onClick={() => {
              if (!atLimit) {
                setRequestedQuantity((value) => value + 1)
              }
            }}
            disabled={!inStock || atLimit}
            aria-label="Increase quantity"
            className="flex h-full w-14 items-center justify-center text-slate-500 disabled:opacity-30"
          >
            <Plus size={17} />
          </button>
        </div>
        <button
          type="button"
          disabled={!inStock}
          onClick={() => addToCart(product, requestedQuantity)}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-purple-200 transition hover:-translate-y-0.5 disabled:bg-slate-200"
        >
          <ShoppingCart size={18} />
          {inStock ? 'Add to Cart' : 'Unavailable'}
        </button>
      </div>
    </>
  )
}
