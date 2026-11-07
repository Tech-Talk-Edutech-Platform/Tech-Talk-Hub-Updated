import {
  BookOpen,
  Check,
  Code2,
  CreditCard,
  Download,
  Headphones,
  LayoutGrid,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import type { ShopBenefit, TrustPoint } from '../types/shop'

/** Ticks under the shop hero heading. */
export const SHOP_HERO_POINTS: { icon: LucideIcon; label: string }[] = [
  { icon: Check, label: 'Premium Quality' },
  { icon: Download, label: 'Fast Delivery' },
  { icon: CreditCard, label: 'Secure Payments' },
]

export const SHOP_BENEFITS: ShopBenefit[] = [
  { icon: Sparkles, title: 'Premium Quality', subtitle: 'Carefully selected' },
  { icon: Download, title: 'Fast Delivery', subtitle: 'Convenient fulfilment' },
  {
    icon: Wrench,
    title: 'Learning Focused',
    subtitle: 'Made for young creators',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    subtitle: 'Safe local checkout',
  },
  { icon: Headphones, title: 'Support', subtitle: "We're here to help" },
]

/** Icons for the "Shop by Category" tiles, in tile order. */
export const CATEGORY_ICONS: LucideIcon[] = [
  LayoutGrid,
  Code2,
  BookOpen,
  Wrench,
  Sparkles,
  ShoppingCart,
]

/** How many categories get a tile (the full list is still filterable by search). */
export const MAX_CATEGORY_TILES = 6

export const PRODUCT_TRUST_POINTS: TrustPoint[] = [
  {
    icon: Truck,
    title: 'Delivery',
    text: 'Delivery details confirmed at checkout.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Checkout',
    text: 'Your order is processed securely.',
  },
  {
    icon: PackageCheck,
    title: 'Quality',
    text: 'Carefully selected learning products.',
  },
  {
    icon: CreditCard,
    title: 'Local Payment',
    text: 'Pay conveniently in Kenya.',
  },
]
