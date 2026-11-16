import { Link } from 'react-router-dom'
import { ExternalLink, TrendingUp } from 'lucide-react'

import type { SalesView } from './navigation'
import { SalesAdminOverview } from './SalesAdminOverview'
import { SalesRepDashboard } from './SalesRepDashboard'
import { useSalesData } from './salesDataContext'
import {
  DEFAULT_MONTHLY_TARGET,
  SupabaseSalesDataProvider,
} from './SupabaseSalesDataProvider'

/** "Sales & Trials" in the admin dashboard, on real data. */
export function AdminSalesView() {
  return (
    <SupabaseSalesDataProvider>
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
            Try it on demo data <ExternalLink size={14} aria-hidden />
          </Link>
        </header>
        <SalesAdminOverview />
      </div>
    </SupabaseSalesDataProvider>
  )
}

/** The dashboard for the `marketer` role (the sales team), on real data. */
export function SalesPortalView({
  userId,
  name,
  view,
  onNavigate,
}: {
  /** The signed-in rep. */
  userId: string
  name: string
  /** The page picked in the dashboard sidebar. */
  view: SalesView
  onNavigate: (view: SalesView) => void
}) {
  return (
    <SupabaseSalesDataProvider>
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <SignedInRep
          userId={userId}
          name={name}
          view={view}
          onNavigate={onNavigate}
        />
      </div>
    </SupabaseSalesDataProvider>
  )
}

function SignedInRep({
  userId,
  name,
  view,
  onNavigate,
}: {
  userId: string
  name: string
  view: SalesView
  onNavigate: (view: SalesView) => void
}) {
  const data = useSalesData()
  // Their own row carries this month's target; a rep whose account was just
  // switched off still sees their work.
  const rep = data.reps.find((candidate) => candidate.id === userId) ?? {
    id: userId,
    name: name.trim() || 'Sales rep',
    monthlyTarget: DEFAULT_MONTHLY_TARGET,
  }
  return <SalesRepDashboard rep={rep} view={view} onNavigate={onNavigate} />
}
