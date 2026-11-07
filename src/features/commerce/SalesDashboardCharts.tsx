// Make per agent per country using the link
// https://chatgpt.com/share/698affad-7f20-8011-bc6f-98cabffa9e81
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { plannedDb } from '../../lib/plannedDb'
// import Loading from "../../dashboards/views/Loading";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts'

type RangeKey = 'week' | 'month' | 'year'

const RANGES: Record<
  RangeKey,
  { label: string; points: number; unit: 'day' | 'month' }
> = {
  week: { label: 'Last 7 Days', points: 7, unit: 'day' },
  month: { label: 'Last 30 Days', points: 30, unit: 'day' },
  year: { label: 'Last 12 Months', points: 12, unit: 'month' },
}

const RANGE_KEYS: RangeKey[] = ['week', 'month', 'year']

interface ChartRow {
  date: string
  calls: number
  followupsCompleted: number
  followupsDue: number
  leadsConverted: number
}

/** One row per day (or month) in the range, oldest first. */
async function loadChartData(range: RangeKey): Promise<ChartRow[]> {
  const config = RANGES[range]
  const periods = Array.from({ length: config.points }, (_, index) => {
    const i = config.points - 1 - index
    const d = new Date()

    if (config.unit === 'day') {
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
    } else {
      d.setMonth(d.getMonth() - i, 1)
      d.setHours(0, 0, 0, 0)
    }

    const end = new Date(d)
    if (config.unit === 'day') {
      end.setHours(23, 59, 59, 999)
    } else {
      end.setMonth(end.getMonth() + 1, 0)
    }

    return { d, from_date: d.toISOString(), to_date: end.toISOString() }
  })

  return Promise.all(
    periods.map(async ({ d, from_date, to_date }) => {
      const dates = { from_date, to_date }
      const [{ data: calls }, { data: followups }, { data: leads }] =
        await Promise.all([
          plannedDb.rpc('calls_count', dates),
          plannedDb.rpc('followup_completion_rate', dates),
          plannedDb.rpc('leads_progressed', dates),
        ])

      return {
        date:
          config.unit === 'month'
            ? d.toLocaleString('default', { month: 'short', year: 'numeric' })
            : d.toLocaleDateString(),
        calls: calls || 0,
        followupsCompleted: followups?.at(0)?.completed || 0,
        followupsDue: followups?.at(0)?.due || 0,
        leadsConverted: leads || 0,
      }
    }),
  )
}

export default function SalesDashboardCharts() {
  const [range, setRange] = useState<RangeKey>('week')
  // const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartRow[]>([])

  useEffect(() => {
    let cancelled = false
    loadChartData(range).then(
      (rows) => {
        if (!cancelled) setChartData(rows)
      },
      (error: unknown) => {
        if (!cancelled) console.error('Failed to load sales charts', error)
      },
    )
    return () => {
      cancelled = true
    }
  }, [range])

  // if (loading) return <Loading label="Loading Chart Data..." />;

  return (
    <div className="space-y-6 p-6">
      {/* RANGE SWITCH */}
      <div className="flex gap-2">
        {RANGE_KEYS.map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase ${
              range === r
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Calls */}
        <ChartCard title={`Calls – ${RANGES[range].label}`}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line dataKey="calls" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ChartCard>

        {/* Follow-ups */}
        <ChartCard title={`Follow-ups – ${RANGES[range].label}`}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="followupsCompleted" fill="#10b981" />
            <Bar dataKey="followupsDue" fill="#f59e0b" />
          </BarChart>
        </ChartCard>

        {/* Leads */}
        <ChartCard title={`Leads Converted – ${RANGES[range].label}`} wide>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line dataKey="leadsConverted" stroke="#14b8a6" strokeWidth={2} />
          </LineChart>
        </ChartCard>
      </div>
    </div>
  )
}

/* Small helper */
interface ChartCardProps {
  title: string
  children: ReactElement
  wide?: boolean
}

const ChartCard = ({ title, children, wide = false }: ChartCardProps) => (
  <div
    className={`rounded-xl bg-white p-4 shadow-sm ${wide ? 'md:col-span-2' : ''}`}
  >
    <h3 className="mb-2 font-bold text-gray-700">{title}</h3>
    <ResponsiveContainer width="100%" height={250}>
      {children}
    </ResponsiveContainer>
  </div>
)
