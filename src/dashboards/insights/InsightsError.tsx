import { CloudOff, SearchX, ShieldAlert, WifiOff } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { describeLoadError, type LoadErrorKind } from '../../lib/loadErrors'

const ICON: Record<LoadErrorKind, typeof CloudOff> = {
  'not-found': SearchX,
  access: ShieldAlert,
  'signed-out': ShieldAlert,
  offline: WifiOff,
  server: CloudOff,
  other: CloudOff,
}

/**
 * A query that failed. Pass the query's `error` so the card says what really
 * happened (e.g. "404 Not Found: this feature isn't set up yet") rather than
 * a generic "couldn't load".
 */
export function InsightsError({
  onRetry,
  error,
  title = 'The dashboard summary could not load',
}: {
  onRetry: () => void
  error?: unknown
  title?: string
}) {
  const problem = error === undefined ? null : describeLoadError(error)
  return (
    <div role="alert">
      <EmptyState
        icon={problem ? ICON[problem.kind] : CloudOff}
        title={title}
        description={
          problem ? (
            <>
              {problem.statusLabel && (
                <span className="mb-1 block font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                  {problem.statusLabel}
                </span>
              )}
              {problem.description}
            </>
          ) : (
            'Try loading this information again.'
          )
        }
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </div>
  )
}

export function InsightsStale({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 px-4 py-2 text-sm">
      <output>Refresh failed. Showing the last available values.</output>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry refresh
      </Button>
    </div>
  )
}
