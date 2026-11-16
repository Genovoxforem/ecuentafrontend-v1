import { useEffect, useState } from 'react'

// The `top` for a sticky element inside a Setup page. The shell (StickyFormShell) keeps its own header (title, description, tabs) sticky at the top of the
// scroll area, with `-top-6` to cancel the area's 24px padding; an element that sticks below it has to start where that header ends. Measured, so it
// follows the header's real height (a wrapped description, a different theme) and window resizes. 0 when there is no such header (tests, other layouts).
const PAD = 24

export function useStickyTop(): number {
  const [top, setTop] = useState(0)
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.blue-density-header')
    if (!header) return
    const measure = () => setTop(Math.max(0, header.offsetHeight - PAD))
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(header)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return top
}
