import { useRef } from 'react'
import { Printer, X } from 'lucide-react'

// The backend's "Print Preview": the receipt page shown inside the app with a Print button. The page is
// embedded, not navigated to.
export function PrintPreviewDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <Printer size={15} /> Print Preview
          </h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <iframe ref={frame} src={url} title="Print preview" className="min-h-[65vh] w-full flex-1 bg-white" />
        <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">
          <button type="button" onClick={onClose} className="rounded-md border border-input-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover">
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              frame.current?.contentWindow?.focus()
              frame.current?.contentWindow?.print()
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  )
}
