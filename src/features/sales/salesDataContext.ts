import { createContext, useContext } from 'react'

import type { SalesDemoData } from './demoData'
import type {
  Lead,
  LeadStatus,
  NewLead,
  NewTrialBooking,
  TrialBooking,
  TrialStatus,
} from './types'

/**
 * Everything the sales screens read and change. `DemoSalesDataProvider` keeps
 * it in memory on demo data; a Supabase-backed provider with the same shape
 * replaces it once the sales tables exist, and the screens stay as they are.
 */
export type SalesData = SalesDemoData & {
  isDemo: boolean
  /** Saves a parent to reach out to. */
  addLead: (input: NewLead) => Lead
  /** Records a call or message, or that the parent isn't interested. */
  setLeadStatus: (
    leadId: string,
    status: Exclude<LeadStatus, 'trial_booked'>,
    salesRepId: string | null,
  ) => void
  /** Books a parent's child into a slot; the lead becomes "Trial booked". */
  bookTrial: (input: NewTrialBooking) => TrialBooking
  setTrialStatus: (bookingId: string, status: TrialStatus) => void
  recordSale: (
    bookingId: string,
    salesRepId: string,
    plan: string,
    amount: number,
  ) => void
}

export const SalesDataContext = createContext<SalesData | null>(null)

export function useSalesData(): SalesData {
  const value = useContext(SalesDataContext)
  if (!value) {
    throw new Error('useSalesData must be used inside a sales data provider.')
  }
  return value
}
