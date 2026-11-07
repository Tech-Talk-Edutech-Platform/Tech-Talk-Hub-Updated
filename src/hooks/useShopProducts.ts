import { useQuery } from '@tanstack/react-query'

import {
  fetchProductBySlug,
  fetchProductsByIds,
  fetchShopProducts,
} from '../lib/api/shop'
import { queryKeys } from '../lib/queryClient'

/** Active shop products, optionally limited to one program's collection. */
export function useShopProducts(program?: string) {
  return useQuery({
    queryKey: queryKeys.site.products(program),
    queryFn: () => fetchShopProducts(program),
  })
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: queryKeys.site.product(slug),
    queryFn: () => fetchProductBySlug(slug),
  })
}

/** Products for the given ids, e.g. the visitor's favorites. */
export function useProductsByIds(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.site.productsByIds(ids),
    queryFn: () => fetchProductsByIds(ids),
  })
}
