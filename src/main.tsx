import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { reportError } from './shared/errorReporter'

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
