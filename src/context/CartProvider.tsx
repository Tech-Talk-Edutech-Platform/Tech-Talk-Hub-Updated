import { useEffect, useState, type ReactNode } from 'react'

import type { CartItem, CartProduct } from '../types/cart'
import { CartContext } from './CartContext'

const CART_STORAGE_KEY = 'tech-talk-cart'

/** Guards data read back from localStorage, which may be stale or hand-edited. */
function isCartItem(value: unknown): value is CartItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'price' in value &&
    typeof value.price === 'number' &&
    'quantity' in value &&
    typeof value.quantity === 'number'
  )
}

function loadSavedCart(): CartItem[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(CART_STORAGE_KEY) || '[]',
    )

    return Array.isArray(saved) ? saved.filter(isCartItem) : []
  } catch {
    return []
  }
}

function getMaximumQuantity(item: {
  track_inventory?: boolean | null
  stock_quantity?: number | null
}): number {
  if (!item.track_inventory) {
    return Infinity
  }

  return Math.max(0, item.stock_quantity || 0)
}

function toCartItem(product: CartProduct, quantity: number): CartItem {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    currency: product.currency || 'KES',
    image_url: product.image_url ?? null,
    stock_quantity: product.stock_quantity ?? null,
    track_inventory: Boolean(product.track_inventory),
    quantity,
  }
}

type CartProviderProps = {
  children: ReactNode
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(loadSavedCart)

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  function addToCart(product: CartProduct, quantity = 1) {
    const amount = Math.max(1, quantity || 1)
    const maximum = getMaximumQuantity(product)

    setItems((current) => {
      if (maximum === 0) {
        return current
      }

      const existing = current.find((item) => item.id === product.id)

      if (existing) {
        const newQuantity = Math.min(existing.quantity + amount, maximum)

        return current.map((item) =>
          item.id === product.id ? toCartItem(product, newQuantity) : item,
        )
      }

      return [...current, toCartItem(product, Math.min(amount, maximum))]
    })
  }

  function removeFromCart(productId: string) {
    setItems((current) => current.filter((item) => item.id !== productId))
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setItems((current) =>
      current.map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.min(quantity, getMaximumQuantity(item)) }
          : item,
      ),
    )
  }

  function incrementItem(productId: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: Math.min(item.quantity + 1, getMaximumQuantity(item)),
            }
          : item,
      ),
    )
  }

  function decrementItem(productId: string) {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.id !== productId) {
          return [item]
        }

        const nextQuantity = item.quantity - 1

        return nextQuantity <= 0 ? [] : [{ ...item, quantity: nextQuantity }]
      }),
    )
  }

  function getItemQuantity(productId: string) {
    return items.find((item) => item.id === productId)?.quantity ?? 0
  }

  function isInCart(productId: string) {
    return items.some((item) => item.id === productId)
  }

  function clearCart() {
    setItems([])
  }

  const totalUnits = items.reduce((total, item) => total + item.quantity, 0)

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  )

  return (
    <CartContext.Provider
      // oxlint-disable-next-line react/jsx-no-constructed-context-values -- the React Compiler memoizes this object
      value={{
        items,
        cartCount: items.length,
        totalUnits,
        subtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        incrementItem,
        decrementItem,
        getItemQuantity,
        isInCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
