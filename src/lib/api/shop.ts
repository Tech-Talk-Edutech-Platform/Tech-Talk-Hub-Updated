import type { ShopProduct } from '../../types/shop'
import { getSupabase } from '../supabase'

/** Active products in shop order; pass `program` to limit to one program's collection. */
export async function fetchShopProducts(
  program?: string,
): Promise<ShopProduct[]> {
  let query = getSupabase()
    .from('shop_products')
    .select('*')
    .eq('is_active', true)

  if (program) {
    query = query.eq('program', program)
  }

  const { data, error } = await query
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

/** An active product by slug, or `null` when there's none. */
export async function fetchProductBySlug(
  slug: string,
): Promise<ShopProduct | null> {
  const { data, error } = await getSupabase()
    .from('shop_products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

/** The active products among `ids` (inactive or deleted ones are dropped). */
export async function fetchProductsByIds(
  ids: string[],
): Promise<ShopProduct[]> {
  if (ids.length === 0) {
    return []
  }

  const { data, error } = await getSupabase()
    .from('shop_products')
    .select('*')
    .in('id', ids)
    .eq('is_active', true)

  if (error) {
    throw error
  }

  return data
}
