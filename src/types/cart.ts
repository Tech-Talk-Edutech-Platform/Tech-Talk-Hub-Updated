/** The product fields the cart needs (a row from the shop's products table). */
export type CartProduct = {
  id: string
  slug: string
  name: string
  price: number
  currency?: string | null
  image_url?: string | null
  stock_quantity?: number | null
  track_inventory?: boolean | null
}

export type CartItem = {
  id: string
  slug: string
  name: string
  price: number
  currency: string
  image_url: string | null
  stock_quantity: number | null
  track_inventory: boolean
  quantity: number
}

export type CartContextValue = {
  items: CartItem[]
  /** Number of distinct products (5 books + 3 kits = 2). */
  cartCount: number
  /** Total physical units across all products. */
  totalUnits: number
  subtotal: number
  addToCart: (product: CartProduct, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  incrementItem: (productId: string) => void
  decrementItem: (productId: string) => void
  getItemQuantity: (productId: string) => number
  isInCart: (productId: string) => boolean
  clearCart: () => void
}
