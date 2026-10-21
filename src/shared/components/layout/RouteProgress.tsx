import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

// Top progress bar that animates on every route change — gives immediate
// visual feedback when a menu item or any link is clicked, covering the
// lazy-load chunk download time. Self-contained: starts on pathname change,
// auto-completes after a short delay, and cleans up its own timers.
export function RouteProgress() {
  const location = useLocation()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timersRef = useRef<number[]>([])
  const prevPathRef = useRef(location.pathname)

  useEffect(() => {
    // Clear any pending timers from a previous transition
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []

    if (prevPathRef.current === location.pathname) return
    prevPathRef.current = location.pathname

    // Start: show bar, jump to ~30% quickly
    setVisible(true)
    setProgress(30)

    // Increment to 60% after 100ms
    timersRef.current.push(
      window.setTimeout(() => setProgress(60), 100),
    )
    // Increment to 80% after 300ms
    timersRef.current.push(
      window.setTimeout(() => setProgress(80), 300),
    )
    // Complete to 100% after 500ms
    timersRef.current.push(
      window.setTimeout(() => setProgress(100), 500),
    )
    // Hide after the fill animation completes
    timersRef.current.push(
      window.setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 700),
    )

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t))
      timersRef.current = []
    }
  }, [location.pathname])

  if (!visible && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div
        className="h-0.5 bg-brand transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 8px var(--color-accent-cyan-2), 0 0 4px var(--color-accent-teal-2)',
        }}
      />
    </div>
  )
}

// Wraps the routed page. A click used to blank the content out for a fixed
// 400ms and show a spinner in its place, which read as a flash even when the
// next page was already loaded. The page now stays mounted and the new one
// fades in, so a fast route feels instant and a slow one still animates.
// It adds no element of its own: several layout rules select the page root as a
// direct child of #route-page-content, and the fade is run on that container by
// AppShell instead (see its scroll-reset effect).
export function ContentLoader({ children }: { children: ReactNode }) {
  return <>{children}</>
}
