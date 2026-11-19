import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartPoint as Point } from '../period'
import { CHART_COLORS } from './chartColors'

export type BarSeries = { key: string; label: string; color: string }

type TooltipEntry = {
  dataKey?: string | number
  value?: number | string
  color?: string
}

function SeriesTooltip({
  active,
  label,
  payload,
  series,
  format,
}: {
  active?: boolean
  label?: string | number
  payload?: readonly TooltipEntry[]
  series: readonly BarSeries[]
  format: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-slate-800">
      <p className="font-bold text-slate-900 dark:text-white">{label}</p>
      {payload.map((entry) => {
        const name =
          series.find((item) => item.key === entry.dataKey)?.label ?? ''
        return (
          <p
            key={String(entry.dataKey)}
            className="mt-0.5 flex items-center gap-1.5 text-slate-600 dark:text-slate-300"
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {name}: {format(Number(entry.value ?? 0))}
          </p>
        )
      })}
    </div>
  )
}

/** Grouped bars over time with a screen-reader table of the same numbers. */
export function BarTrendChart({
  data,
  series,
  caption,
  format = String,
}: {
  data: readonly Point[]
  series: readonly BarSeries[]
  caption: string
  format?: (value: number) => string
}) {
  return (
    <figure className="min-w-0">
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {series.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...data]}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              vertical={false}
              className="stroke-slate-100 dark:stroke-white/10"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={format === String ? 32 : 64}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(value: number) => format(value)}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
              content={<SeriesTooltip series={series} format={format} />}
            />
            {series.map((item) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                fill={item.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Period</th>
              {series.map((item) => (
                <th key={item.key}>{item.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.label}>
                <td>{point.label}</td>
                {series.map((item) => (
                  <td key={item.key}>{format(Number(point[item.key] ?? 0))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}

export type DonutSlice = { name: string; value: number }

/** Share-of-total ring with a labelled legend; colours follow slice order. */
export function DonutChart({
  data,
  centerLabel,
}: {
  data: readonly DonutSlice[]
  centerLabel: string
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0)

  return (
    <figure className="min-w-0">
      <div className="relative mx-auto h-48 max-w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[...data]}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={data.length > 1 ? 3 : 0}
              cornerRadius={6}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((slice, index) => (
                <Cell
                  key={slice.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900 tabular-nums dark:text-white">
            {total}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {centerLabel}
          </span>
        </div>
      </div>
      <figcaption>
        <ul className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {data.map((slice, index) => {
            const share = total ? Math.round((slice.value / total) * 100) : 0
            return (
              <li
                key={slice.name}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-300"
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="font-bold text-slate-900 tabular-nums dark:text-white">
                  {share}%
                </span>
              </li>
            )
          })}
        </ul>
      </figcaption>
    </figure>
  )
}
