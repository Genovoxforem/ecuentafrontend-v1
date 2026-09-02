import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

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

// Inner-page content loader: shows a centered spinner inside the <main>
// content area during every route transition. Unlike Suspense's fallback
// (which only fires on the first lazy-chunk download), this fires on every
// pathname change — so navigating between already-loaded routes still gives
// clear "content is loading" feedback. Renders children (the actual page)
// once the transition settles; renders the spinner overlay while waiting.
export function ContentLoader({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const prevPathRef = useRef(location.pathname)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (prevPathRef.current === location.pathname) return
    prevPathRef.current = location.pathname

    // Show spinner immediately on route change
    setLoading(true)

    // Clear it after a short delay — covers lazy chunk download + render.
    // If the lazy Suspense fallback is already showing, this overlay sits
    // on top briefly and then disappears to reveal the loaded content.
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setLoading(false), 400)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [location.pathname])

  if (!loading) return <>{children}</>

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
      <Loader2 size={32} className="animate-spin text-brand" />
      <p className="text-sm text-text-faint">Loading…</p>
    </div>
  )
}
