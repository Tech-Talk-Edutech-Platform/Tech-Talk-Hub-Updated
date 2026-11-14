import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatMoney } from '../../lib/money'
import type { WeekPoint } from './metrics'

type TooltipEntry = { payload?: WeekPoint }

function WeekTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-slate-800">
      <p className="font-bold text-slate-900 dark:text-white">
        Week of {point.week}
      </p>
      <p className="mt-0.5 text-slate-600 dark:text-slate-300">
        {point.sales} {point.sales === 1 ? 'sale' : 'sales'} ·{' '}
        {formatMoney(point.revenue)}
      </p>
    </div>
  )
}

/** Sales closed per week; one series, so the title names it (no legend). */
export function SalesWeeklyChart({ data }: { data: readonly WeekPoint[] }) {
  return (
    <figure className="min-w-0">
      <div className="h-56 text-purple-600 dark:text-purple-400">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...data]}
            margin={{ top: 8, right: 4, bottom: 0, left: -24 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="0"
              className="stroke-slate-100 dark:stroke-white/10"
            />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
              content={<WeekTooltip />}
            />
            <Bar
              dataKey="sales"
              fill="currentColor"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>Sales per week</caption>
          <thead>
            <tr>
              <th>Week</th>
              <th>Sales</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.week}>
                <td>{point.week}</td>
                <td>{point.sales}</td>
                <td>{formatMoney(point.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
