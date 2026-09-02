import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../errorReporter'

interface ErrorBoundaryProps {
  children: ReactNode
  // Rendered in place of children once an error is caught. Defaults to a
  // small inline message sized for a single route's content area — pass a
  // bigger one at the root so a provider/shell-level crash doesn't just
  // show a tiny card in the middle of an otherwise-blank page.
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

// Class component because React has no hook-based equivalent — this is the
// one place in the app that's intentionally not a function component.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { source: 'ErrorBoundary', context: { componentStack: info.componentStack ?? undefined } })
  }

  // Reset error state to re-render children — useful when the error was
  // transient (e.g. a lazy chunk failed to load on flaky network) and the
  // user wants to try again without a full page reload.
  resetError = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? <DefaultFallback error={this.state.error} onRetry={this.resetError} />
    }
    return this.props.children
  }
}

function DefaultFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm">
      <p className="font-medium text-danger">This section failed to load.</p>
      <p className="text-text-muted">{error.message}</p>
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-alt"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-alt"
        >
          Reload page
        </button>
      </div>
    </div>
  )
}
