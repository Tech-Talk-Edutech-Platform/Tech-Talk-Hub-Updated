import type { LucideIcon } from 'lucide-react'

import type { Tables } from './database'

/** A row from the Supabase `shop_products` table. */
export type ShopProduct = Tables<'shop_products'>

export type ShopBenefit = {
  icon: LucideIcon
  title: string
  subtitle: string
}

export type TrustPoint = {
  icon: LucideIcon
  title: string
  text: string
}
