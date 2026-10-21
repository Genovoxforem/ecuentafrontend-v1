import { useEffect, useState } from 'react'
import { Info, X } from 'lucide-react'

// Auto-shows once when a page with no real JSON API mounts, then
// auto-dismisses — replacing the inline "no JSON API" banner card used
// elsewhere in this app for the same situation. Self-contained (no global
// toast queue/provider): each page that needs one renders its own, since
// there's never more than one per page.
export function NoDataToast({ message, durationMs = 6000 }: { message: string; durationMs?: number }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), durationMs)
    return () => clearTimeout(timer)
  }, [durationMs])

  if (!visible) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-2.5 rounded-xl border border-info-fg/20 bg-info-bg px-4 py-3 text-info-fg shadow-lg animate-[toast-in_0.2s_ease-out_forwards]"
    >
      <Info size={16} className="shrink-0 mt-0.5" />
      <p className="min-w-0 flex-1 break-words text-sm leading-snug">{message}</p>
      <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss" className="shrink-0 p-0.5 rounded-md hover:bg-info-fg/10">
        <X size={14} />
      </button>
    </div>
  )
}
