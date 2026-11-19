import { CloudOff } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'

/** Shown when a dashboard summary fails to load. */
export function InsightsError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={CloudOff}
      title="The dashboard summary could not load"
      description="Check your connection and try again."
      action={
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}
