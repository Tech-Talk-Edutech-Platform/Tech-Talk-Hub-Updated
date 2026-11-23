import { lazy, Suspense, type ComponentProps } from 'react'

// Recharts loads only when a dashboard chart renders, keeping it out of the
// first dashboard bundle and the server render.
const BarTrend = lazy(() =>
  import('./charts').then((module) => ({ default: module.BarTrendChart })),
)
const Donut = lazy(() =>
  import('./charts').then((module) => ({ default: module.DonutChart })),
)

function ChartSkeleton({ height }: { height: string }) {
  return (
    <div
      aria-hidden="true"
      className={`${height} w-full animate-pulse rounded-xl bg-slate-100 dark:bg-white/5`}
    />
  )
}

export function BarTrendChart(
  props: ComponentProps<typeof import('./charts').BarTrendChart>,
) {
  return (
    <Suspense fallback={<ChartSkeleton height="h-60" />}>
      <BarTrend {...props} />
    </Suspense>
  )
}

export function DonutChart(
  props: ComponentProps<typeof import('./charts').DonutChart>,
) {
  return (
    <Suspense fallback={<ChartSkeleton height="h-48" />}>
      <Donut {...props} />
    </Suspense>
  )
}
