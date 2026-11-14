import { useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react'
import { useUploadProductsToZra, type UploadLine } from '../productUpload.data'

// Bulk upload of the ticked products to ZRA. It first asks the server for a preview (nothing is sent), then waits for the user to confirm; the answer of
// the confirmed call lists, product by product, what ZRA accepted and its own error text for what it refused.
function Line({ line }: { line: UploadLine }) {
  return (
    <li className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      {line.accepted === true && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />}
      {line.accepted === false && <XCircle size={16} className="mt-0.5 shrink-0 text-danger" />}
      {line.accepted === null && <UploadCloud size={16} className="mt-0.5 shrink-0 text-text-faint" />}
      <div className="min-w-0 text-sm">
        <p className="font-medium text-text! truncate">{line.name}</p>
        {line.message && <p className={`text-xs ${line.accepted === false ? 'text-danger' : 'text-text-muted'}`}>{line.message}</p>}
      </div>
    </li>
  )
}

export function UploadProductsDialog({ ids, onClose }: { ids: number[]; onClose: () => void }) {
  const upload = useUploadProductsToZra()
  const asked = useRef(false)
  useEffect(() => {
    if (asked.current) return
    asked.current = true
    upload.mutate({ ids, confirm: false })
  }, [ids, upload])

  const outcome = upload.data
  const sending = upload.isPending && upload.variables?.confirm === true
  const previewing = upload.isPending && upload.variables?.confirm === false

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Upload products to ZRA">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-xl">
        <div className="border-b border-border px-5 py-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-text!">
            <UploadCloud size={18} className="text-brand" /> Upload Products to ZRA
          </h3>
          <p className="text-xs text-text-faint mt-0.5">
            {ids.length} product{ids.length === 1 ? '' : 's'} selected
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto px-5 py-3 soft-scrollbar">
          {previewing && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" /> Checking what would be sent…
            </p>
          )}
          {sending && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" /> Sending to ZRA…
            </p>
          )}
          {upload.isError && (
            <p role="alert" className="text-sm font-medium text-danger">
              {upload.error instanceof Error ? upload.error.message : 'The ZRA upload failed.'}
            </p>
          )}
          {outcome?.kind === 'preview' && !upload.isPending && (
            <>
              <p className="text-sm text-text-muted mb-2">
                Nothing has been sent yet. {outcome.lines.length} product{outcome.lines.length === 1 ? '' : 's'} will be sent to ZRA when you confirm.
              </p>
              <ul>{outcome.lines.map((l, i) => <Line key={`${l.id ?? l.name}-${i}`} line={l} />)}</ul>
            </>
          )}
          {outcome?.kind === 'sent' && !upload.isPending && (
            <>
              <p role="status" className="text-sm font-medium text-text! mb-2">
                {outcome.sent} sent · <span className="text-success">{outcome.accepted} accepted</span> · <span className={outcome.refused ? 'text-danger' : ''}>{outcome.refused} refused</span>
              </p>
              <ul>{outcome.lines.map((l, i) => <Line key={`${l.id ?? l.name}-${i}`} line={l} />)}</ul>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-input-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover">
            {outcome?.kind === 'sent' ? 'Close' : 'Cancel'}
          </button>
          {outcome?.kind === 'preview' && (
            <button
              type="button"
              disabled={upload.isPending || outcome.lines.length === 0}
              onClick={() => upload.mutate({ ids, confirm: true })}
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              Confirm upload
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
