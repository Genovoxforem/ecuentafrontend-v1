import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { reportError } from './shared/errorReporter'
import { isCrossOriginDeployment, getBackendUrl } from './api/backends'

// When deployed on a separate domain/origin (e.g. cPanel frontend, remote Dolibarr backend),
// rewrite relative backend fetch requests to the target backend URL and include credentials.
if (isCrossOriginDeployment()) {
  const originalFetch = window.fetch.bind(window)
  const backendUrl = getBackendUrl()
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('/assets/') && !input.endsWith('.html')) {
      return originalFetch(`${backendUrl}${input}`, {
        ...init,
        credentials: init?.credentials ?? 'include',
      })
    }
    if (input instanceof URL && input.pathname.startsWith('/') && input.origin === window.location.origin) {
      const fullUrl = `${backendUrl}${input.pathname}${input.search}${input.hash}`
      return originalFetch(fullUrl, {
        ...init,
        credentials: init?.credentials ?? 'include',
      })
    }
    return originalFetch(input, init)
  }
}

// Catch unhandled promise rejections (e.g. fetch calls outside React Query)
// and route them through the centralized error reporter.
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
  reportError(error, { source: 'unhandledRejection' })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
