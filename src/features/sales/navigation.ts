import {
  CalendarPlus,
  ClipboardList,
  Contact,
  LayoutDashboard,
  MessageCircle,
} from 'lucide-react'

/**
 * The sales team's pages. The dashboard sidebar lists `SALES_NAV` under
 * "Sales" (its "Overview" group already links the dashboard itself), and the
 * preview's sidebar lists the same pages.
 */
export const SALES_NAV = [
  { id: 'parents', label: 'Parents', icon: Contact },
  { id: 'book', label: 'Book a Trial', icon: CalendarPlus },
  { id: 'bookings', label: 'Trial Bookings', icon: ClipboardList },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
] as const

export const SALES_DASHBOARD = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
} as const

export type SalesView =
  typeof SALES_DASHBOARD.id | (typeof SALES_NAV)[number]['id']

export function isSalesView(value: string): value is SalesView {
  return (
    value === SALES_DASHBOARD.id || SALES_NAV.some((item) => item.id === value)
  )
}
