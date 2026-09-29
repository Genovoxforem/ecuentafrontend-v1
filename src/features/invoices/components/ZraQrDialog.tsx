import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, FileText, Loader2, QrCode, X } from 'lucide-react'

// The classic Sales Invoices list shows a small QR icon on every invoice
// uploaded to ZRA, linking out to ZRA's own verification portal. That page is
// ZRA's: it is generated on their server from the fiscal record (taxpayer name
// and TPIN as registered with ZRA, the uploaded lines, SDC ID, receipt
// signature, internal data), so its content cannot be rebuilt from eCuenta's
// data alone. Confirmed live: the portal sends no CORS headers (a script can't
// read it) but also no X-Frame-Options / frame-ancestors, so it can be shown
// inside the app in a frame. This dialog therefore offers the real ZRA tax
// invoice in-app ("Tax invoice") plus the QR code generated from the same URL
// ("QR code") — nothing in the app itself navigates away.
type View = 'invoice' | 'qr'

export function ZraQrDialog({ url, invoiceRef, onClose }: { url: string; invoiceRef: string; onClose: () => void }) {
  const [view, setView] = useState<View>('invoice')
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [frameLoading, setFrameLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(url, { width: 280, margin: 1 })
      .then((d) => alive && setDataUrl(d))
      .catch(() => alive && setDataUrl(null))
    return () => {
      alive = false
    }
  }, [url])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — the URL is still shown below */
    }
  }

  const tab = (v: View) =>
    `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${view === v ? 'bg-brand text-white' : 'border border-border text-text hover:bg-surface-hover'}`

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl bg-white p-5 shadow-xl dark:bg-gray-950" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-text!">
            <FileText size={18} className="text-brand" /> ZRA tax invoice — {invoiceRef}
          </h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <button type="button" onClick={() => setView('invoice')} className={tab('invoice')}>
            <FileText size={14} /> Tax invoice
          </button>
          <button type="button" onClick={() => setView('qr')} className={tab('qr')}>
            <QrCode size={14} /> QR code
          </button>
          <button type="button" onClick={copy} className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover">
            <Copy size={14} /> {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        {view === 'invoice' ? (
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-white">
            {frameLoading && (
              <div className="absolute inset-0 grid place-items-center text-sm text-text-muted">
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Loading from ZRA…
                </span>
              </div>
            )}
            <iframe title={`ZRA tax invoice ${invoiceRef}`} src={url} onLoad={() => setFrameLoading(false)} referrerPolicy="no-referrer" className="h-[68vh] w-full" />
          </div>
        ) : (
          <div className="grid place-items-center rounded-lg border border-border bg-white p-4">
            {dataUrl ? <img src={dataUrl} alt={`ZRA QR code for ${invoiceRef}`} className="h-64 w-64" /> : <div className="h-64 w-64 animate-pulse rounded bg-surface" />}
            <p className="mt-2 text-sm text-text-muted">Scan to verify this invoice on the ZRA portal.</p>
          </div>
        )}
        <p className="mt-3 break-all rounded-md bg-surface px-3 py-2 text-xs text-text-muted select-all">{url}</p>
      </div>
    </div>
  )
}
