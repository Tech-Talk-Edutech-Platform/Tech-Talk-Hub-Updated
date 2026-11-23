import { CloudOff } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'

export function InsightsError({
  onRetry,
  title = 'The dashboard summary could not load',
}: {
  onRetry: () => void
  title?: string
}) {
  return (
    <div role="alert">
      <EmptyState
        icon={CloudOff}
        title={title}
        description="Try loading this information again."
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
