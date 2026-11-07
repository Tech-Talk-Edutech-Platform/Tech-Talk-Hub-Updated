import type { ShopProduct } from '../types/shop'

type StockFields = Pick<ShopProduct, 'track_inventory' | 'stock_quantity'>

/** Products that don't track inventory are always available. */
export function isInStock(product: StockFields): boolean {
  return !product.track_inventory || (product.stock_quantity || 0) > 0
}

/** True when `quantity` already uses up all tracked stock. */
export function isAtStockLimit(
  product: StockFields,
  quantity: number,
): boolean {
  return (
    Boolean(product.track_inventory) &&
    quantity >= (product.stock_quantity || 0)
  )
}

export function productHref(slug: string): string {
  return `/shop/${slug}`
}
