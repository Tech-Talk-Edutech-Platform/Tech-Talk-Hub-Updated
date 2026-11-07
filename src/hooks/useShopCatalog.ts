import { useMemo, useState } from 'react'

import type { ShopProduct } from '../types/shop'

export const ALL_CATEGORIES = 'All'

function matchesSearch(product: ShopProduct, query: string): boolean {
  return [
    product.name,
    product.short_description,
    product.category,
    product.program,
  ].some((field) => field?.toLowerCase().includes(query))
}

/**
 * Search, category and "featured first" state for the shop grid. Until the
 * visitor searches, picks a category or asks for everything, only featured
 * products are shown (when there are any).
 */
export function useShopCatalog(products: ShopProduct[]) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES)
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(true)

  const categories = useMemo(
    () => [
      ALL_CATEGORIES,
      ...new Set(products.map((product) => product.category).filter(Boolean)),
    ],
    [products],
  )

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return products.filter(
      (product) =>
        (activeCategory === ALL_CATEGORIES ||
          product.category === activeCategory) &&
        (!query || matchesSearch(product, query)),
    )
  }, [products, search, activeCategory])

  const featuredProducts = filteredProducts.filter(
    (product) => product.is_featured,
  )

  const displayingFeatured =
    showFeaturedOnly &&
    activeCategory === ALL_CATEGORIES &&
    !search.trim() &&
    featuredProducts.length > 0

  const heading =
    activeCategory !== ALL_CATEGORIES
      ? activeCategory
      : search.trim()
        ? 'Search Results'
        : displayingFeatured
          ? 'Featured Products'
          : 'All Products'

  function selectCategory(category: string) {
    setActiveCategory(category)
    setShowFeaturedOnly(false)
  }

  function resetFilters() {
    setSearch('')
    setActiveCategory(ALL_CATEGORIES)
    setShowFeaturedOnly(false)
  }

  return {
    search,
    setSearch,
    activeCategory,
    selectCategory,
    categories,
    displayedProducts: displayingFeatured ? featuredProducts : filteredProducts,
    heading,
    isFiltered: Boolean(search) || activeCategory !== ALL_CATEGORIES,
    resetFilters,
  }
}
