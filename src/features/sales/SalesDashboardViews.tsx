import { Link } from 'react-router-dom'
import { ExternalLink, TrendingUp } from 'lucide-react'

import { DEMO_SALES_REPS } from './demoData'
import { DemoSalesDataProvider } from './DemoSalesDataProvider'
import type { SalesView } from './navigation'
import { SalesAdminOverview } from './SalesAdminOverview'
import { SalesRepDashboard } from './SalesRepDashboard'
import { DemoBanner } from './ui'

/** "Sales & Trials" in the admin dashboard. */
export function AdminSalesView() {
  return (
    <DemoSalesDataProvider>
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              <TrendingUp className="text-purple-600" aria-hidden /> Sales &
              trials
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Every sales rep, mentor, trial booking and WhatsApp message.
            </p>
          </div>
          <Link
            to="/preview/sales"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            See it as a sales rep or mentor{' '}
            <ExternalLink size={14} aria-hidden />
          </Link>
        </header>
        <DemoBanner />
        <SalesAdminOverview />
      </div>
    </DemoSalesDataProvider>
  )
}

/**
 * The dashboard for the `marketer` role (the sales team). It shows demo
 * data until the sales
 * tables exist; then a Supabase-backed provider replaces the demo one.
 */
export function SalesPortalView({
  name,
  view,
  onNavigate,
}: {
  name: string
  /** The page picked in the dashboard sidebar. */
  view: SalesView
  onNavigate: (view: SalesView) => void
}) {
  const demoRep = DEMO_SALES_REPS[0]
  if (!demoRep) return null
  // The signed-in marketer stands in for the first demo rep.
  const rep = { ...demoRep, name: name.trim() || demoRep.name }
  return (
    <DemoSalesDataProvider>
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <SalesRepDashboard
          rep={rep}
          view={view}
          onNavigate={onNavigate}
          banner={
            <DemoBanner>
              Your real parents, bookings and sales appear here once the sales
              tables are live. Until then this shows example data.
            </DemoBanner>
          }
        />
      </div>
    </DemoSalesDataProvider>
  )
}
