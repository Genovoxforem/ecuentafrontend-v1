import { Suspense, type ReactNode } from 'react'
import { ErrorBoundary } from '../shared/components/ErrorBoundary'
import { RouteFallback } from '../shared/components/RouteFallback'

// Wraps every route's element: Suspense covers the lazy-chunk download (a
// no-op for the eager login route below), ErrorBoundary means a crash in one
// module blanks only that route's content, not the sidebar/navbar chrome
// around it or the rest of the app.
export function RouteBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </ErrorBoundary>
  )
}
