import { Button } from '../../components/ui/Button'

/**
 * Empty-state call to action that opens another dashboard view. Renders
 * nothing when the host page cannot navigate.
 */
export function NavButton({
  label,
  view,
  onNavigate,
}: {
  label: string
  view: string
  onNavigate?: (view: string) => void
}) {
  if (!onNavigate) return null
  return (
    <Button size="sm" variant="outline" onClick={() => onNavigate(view)}>
      {label}
    </Button>
  )
}
