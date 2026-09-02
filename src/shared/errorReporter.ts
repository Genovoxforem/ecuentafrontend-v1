// Centralized error reporting — a single pluggable interface so the app
// has one place to route errors to (console in dev, Sentry/external service
// in prod). Every error path (ErrorBoundary, query cache errors, unhandled
// promise rejections) funnels through here, avoiding scattered console.error
// calls that are easy to miss in production logs.

export interface ErrorContext {
  // Free-form bucket name — "ErrorBoundary", "queryCache", "unhandledRejection",
  // etc. Lets the reporter filter/route by source without parsing stack traces.
  source: string
  // Optional component stack from React's ErrorInfo, the query key, or any
  // other structured context that helps diagnose the error.
  context?: Record<string, unknown>
}

type ErrorReporterFn = (error: Error, context: ErrorContext) => void

// Default reporter: console.error in dev, no-op in prod (replace with
// Sentry/external service initialization at app startup when ready).
const defaultReporter: ErrorReporterFn = (error, { source, context }) => {
  if (import.meta.env.DEV) {
    console.error(`[${source}]`, error, context ?? '')
  }
}

let activeReporter: ErrorReporterFn = defaultReporter

// Swap the active reporter at app startup (e.g. to wire in Sentry).
// Called once from main.tsx or the app's bootstrap path.
export function setErrorReporter(reporter: ErrorReporterFn): void {
  activeReporter = reporter
}

// Main entry point — call from any error path.
export function reportError(error: Error, context: ErrorContext): void {
  activeReporter(error, context)
}
