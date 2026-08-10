import { useState } from 'react'
import { ShoppingCart, ExternalLink, LoaderCircle } from 'lucide-react'
import { useSalesInvoiceLookup } from '../zra.queries'

const FIELD_LABELS = [
  ['invoiceNumber', 'Invoice Number'],
  ['receiptNumber', 'Receipt Number'],
  ['receiptDate', 'Receipt Date'],
  ['internalData', 'Internal Data'],
  ['receiptSignature', 'Receipt Signature'],
  ['sdcId', 'SDC ID'],
  ['mrcNumber', 'MRC Number'],
] as const

// Real "ZRA Sales List" page (custom/zra/saleszralist.php) is not a list at
// all — it's a live, read-only lookup of a single invoice's real ZRA
// verification record (receipt number/signature/SDC ID/QR code) straight
// from the government gateway's /trnsSales/selectInvoice endpoint, by CIS
// Invoice Number. See /zra/sales-lookup/ (useSalesInvoiceLookup).
export function SalesInvoiceLookup() {
  const [cisInvcNo, setCisInvcNo] = useState('')
  const lookup = useSalesInvoiceLookup()

  function handleSearch() {
    if (!cisInvcNo.trim()) return
    lookup.mutate(cisInvcNo.trim())
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-text!">
        <ShoppingCart size={20} className="text-brand" />
        ZRA Sales List
      </h2>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text-muted">Search By CIS Invoice No</span>
          <input
            type="text"
            value={cisInvcNo}
            onChange={(e) => setCisInvcNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-10 w-72 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          disabled={lookup.isPending || !cisInvcNo.trim()}
          className="flex items-center gap-1.5 h-10 px-4 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
        >
          {lookup.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
          Fetch Details
        </button>
      </div>

      {lookup.isError && (
        <p className="text-sm text-danger">
          {lookup.error instanceof Error ? lookup.error.message : 'Could not reach the ZRA gateway — please try again.'}
        </p>
      )}

      {lookup.data && !lookup.data.found && <p className="text-sm text-text-faint">No matching invoice found for that CIS Invoice Number.</p>}

      {lookup.data?.found && (
        <div className="rounded-xl border border-border bg-surface-alt p-5 max-w-xl">
          <dl className="space-y-2">
            {FIELD_LABELS.map(([key, label]) => (
              <div key={key} className="flex items-center gap-4 text-sm">
                <dt className="w-40 shrink-0 text-text-muted">{label}:</dt>
                <dd className="text-text! font-medium">{lookup.data![key] || '-'}</dd>
              </div>
            ))}
            <div className="flex items-center gap-4 text-sm">
              <dt className="w-40 shrink-0 text-text-muted">QR Code URL:</dt>
              <dd>
                {lookup.data.qrCodeUrl ? (
                  <a
                    href={lookup.data.qrCodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-brand hover:underline font-medium"
                  >
                    View QR Code <ExternalLink size={13} />
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}
