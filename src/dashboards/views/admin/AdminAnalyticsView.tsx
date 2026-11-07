import React from 'react'
import { BarChart3 } from 'lucide-react'
import AnalyticsDashboard from '../../../features/commerce/Analytics'

export default function AdminAnalyticsView() {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xs md:p-8">
        <h2 className="mb-2 flex items-center gap-3 text-2xl font-black text-slate-900">
          <BarChart3 className="text-purple-600" /> Advanced Financial & Growth
          Analytics
        </h2>
        <p className="text-xs font-bold text-slate-400">
          Comprehensive telemetry tracking platform revenue, conversion funnels,
          and usage metrics.
        </p>
      </div>

      <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xs">
        <AnalyticsDashboard isOpen={true} onClose={() => undefined} />
      </div>
    </div>
  )
}
