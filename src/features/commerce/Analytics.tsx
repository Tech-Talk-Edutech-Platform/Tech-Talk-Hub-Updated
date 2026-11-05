import SalesDashboard from './SalesDashboard'
import SalesDashboardCharts from './SalesDashboardCharts'
import { BarChart3, X } from 'lucide-react'

interface AnalyticsDashboardProps {
  isOpen: boolean
  onClose: () => void
}

export default function AnalyticsDashboard({
  isOpen,
  onClose,
}: AnalyticsDashboardProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="max-h-[85vh] w-full max-w-6xl overflow-y-auto rounded-[40px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <BarChart3 className="text-purple-600" /> Sales Analytics
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X />
          </button>
        </div>

        <div className="space-y-8 p-6">
          <SalesDashboard />
          <SalesDashboardCharts />
        </div>
      </div>
    </div>
  )
}
