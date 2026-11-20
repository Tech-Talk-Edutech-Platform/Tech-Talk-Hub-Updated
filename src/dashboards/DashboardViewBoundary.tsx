import { Component, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'

export class DashboardViewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="space-y-3 p-6">
        <p>
          This dashboard view could not open. Try again or choose another view.
        </p>
        <Button type="button" onClick={() => this.setState({ failed: false })}>
          Try again
        </Button>
      </div>
    )
  }
}
