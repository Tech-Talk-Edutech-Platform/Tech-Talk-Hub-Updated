import { useEffect, useState } from 'react'
import { plannedDb } from '../../lib/plannedDb'
import { PhoneCall, DollarSign } from 'lucide-react'

const PROVIDER_RATE_PER_MIN = 0.02 // USD – change per provider (Twilio, etc.)

interface CallCostStats {
  today: string
  week: string
  month: string
}

async function loadCallCosts(): Promise<CallCostStats> {
  const now = new Date()

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const { data, error } = await plannedDb
    .from('call_logs')
    .select('duration_seconds, created_at')

  if (error) throw error

  let today = 0
  let week = 0
  let month = 0

  for (const call of data) {
    const callDate = new Date(call.created_at)
    const minutes = (call.duration_seconds || 0) / 60
    const cost = minutes * PROVIDER_RATE_PER_MIN

    if (callDate >= startOfToday) today += cost
    if (callDate >= startOfWeek) week += cost
    if (callDate >= startOfMonth) month += cost
  }

  return {
    today: today.toFixed(2),
    week: week.toFixed(2),
    month: month.toFixed(2),
  }
}

export default function CallCost() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CallCostStats>({
    today: '0.00',
    week: '0.00',
    month: '0.00',
  })

  useEffect(() => {
    let cancelled = false
    loadCallCosts().then(
      (next) => {
        if (cancelled) return
        setStats(next)
        setLoading(false)
      },
      (error: unknown) => {
        if (cancelled) return
        console.error('Failed to load call logs', error)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <PhoneCall className="text-indigo-600" />
        <h3 className="font-bold text-gray-700">Call Costs (USD)</h3>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Calculating…</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Today" value={stats.today} />
          <Stat label="This Week" value={stats.week} />
          <Stat label="This Month" value={stats.month} />
        </div>
      )}
    </div>
  )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <p className="text-xs text-gray-500">{label}</p>
    <div className="flex items-center justify-center gap-1">
      <DollarSign size={14} className="text-green-600" />
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  </div>
)
