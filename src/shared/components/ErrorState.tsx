import { useEffect, useRef, useState, type ReactNode } from 'react'
import { classifyError, type ErrorKind } from './errorKind'
import { AlertTriangle, Lock, RefreshCw, SearchX, ServerCrash, WifiOff, type LucideIcon } from 'lucide-react'

// One professional "could not load" state for every screen that reads from the backend: it tells the user in plain words what went
// wrong (offline, server not answering, server error, session, not found), keeps the technical text under "Show details",
// and offers Retry. When the failure is "offline" it retries once by itself as soon as the browser is back online.

interface Parsed {
  kind: ErrorKind
  heading: string
  hint: string
  Icon: LucideIcon
}

function describe(kind: ErrorKind): Omit<Parsed, 'kind'> {
  switch (kind) {
    case 'offline':
      return { heading: 'No internet connection', hint: 'Check your network connection. This page will try again by itself when you are back online.', Icon: WifiOff }
    case 'unreachable':
      return { heading: 'The server is not responding', hint: 'The service is busy or temporarily unavailable. Please wait a moment and try again.', Icon: ServerCrash }
    case 'server':
      return { heading: 'Something went wrong on the server', hint: 'The request reached the server but it could not complete it. Try again; if it keeps happening, contact support.', Icon: ServerCrash }
    case 'session':
      return { heading: 'Your session needs attention', hint: 'You may have been signed out or may not have access to this data. Sign in again and retry.', Icon: Lock }
    case 'notfound':
      return { heading: 'This data is not available', hint: 'The service did not find what this page asked for.', Icon: SearchX }
    default:
      return { heading: 'We could not load this page', hint: 'Please try again. If the problem continues, contact support.', Icon: AlertTriangle }
  }
}

export interface ErrorStateProps {
  // What was being loaded, e.g. "Couldn't load the ledger". Shown small above the heading as context.
  title: string
  // The technical text of the error (kept under "Show details").
  message: string
  onRetry: () => void | Promise<unknown>
  // Extra actions or content (a login link, a reconnect form).
  children?: ReactNode
}

export function ErrorState({ title, message, onRetry, children }: ErrorStateProps) {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [retrying, setRetrying] = useState(false)
  const kind = classifyError(message, online)
  const { heading, hint, Icon } = describe(kind)
  const retryRef = useRef(onRetry)
  retryRef.current = onRetry

  async function retry() {
    setRetrying(true)
    try {
      await retryRef.current()
    } finally {
      setRetrying(false)
    }
  }

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      if (kind === 'offline') void retry()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  return (
    <div role="alert" className="mx-auto flex w-full max-w-xl flex-col items-center rounded-xl border border-border bg-surface-alt px-6 py-10 text-center shadow-sm">
      <span className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${kind === 'offline' ? 'bg-warning-bg text-warning-fg' : 'bg-danger-bg text-danger-fg'}`}>
        <Icon size={26} aria-hidden="true" />
      </span>
      <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{title}</p>
      <h2 className="mt-1 text-lg font-semibold text-text!">{heading}</h2>
      <p className="mt-2 max-w-md text-sm text-text-muted">{hint}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => void retry()}
          disabled={retrying}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} aria-hidden="true" />
          {retrying ? 'Trying again…' : 'Try again'}
        </button>
        {children}
      </div>

      {message && (
        <details className="mt-5 w-full max-w-md text-left">
          <summary className="cursor-pointer select-none text-center text-xs text-text-faint hover:text-text-muted">Show details</summary>
          <p className="mt-2 break-words rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-muted">{message}</p>
        </details>
      )}
    </div>
  )
}
