import { useState } from 'react'
import { CreditCard, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { getBackendUrl } from '../../../api/backends'
import { formatMoney } from '../../../utils/format'
import { useCancelOnlinePayment, useOnlinePaymentInfo, useOnlinePaymentStatus, useStartOnlinePayment } from '../invoiceOnlinePayment.queries'

// The hosted Lenco widget lives on a backend page; the checkout URL is a path on the backend's origin.
const checkoutHref = (path: string) => (/^https?:\/\//i.test(path) ? path : `${new URL(getBackendUrl()).origin}${path}`)

// compta/facture/fapi/online_payment.php: the gateway state, whether the invoice is payable and why not,
// start (records an attempt, answers the checkout URL), poll until the callback has recorded the payment, cancel.
export function OnlinePaymentModal({ invoiceId, onClose }: { invoiceId: string | number; onClose: () => void }) {
  const { data, isLoading, isError, error } = useOnlinePaymentInfo(invoiceId)
  const start = useStartOnlinePayment(invoiceId)
  const cancel = useCancelOnlinePayment(invoiceId)
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState<string | undefined>()
  const [message, setMessage] = useState('')
  const status = useOnlinePaymentStatus(reference)
  const pay = amount === '' ? (data?.remaining ?? 0) : Number(amount)

  function begin() {
    setMessage('')
    start.mutate(pay, {
      onSuccess: (r) => {
        setReference(r.reference)
        window.open(checkoutHref(r.checkoutUrl), '_blank', 'noopener')
      },
      onError: (e) => setMessage(e instanceof Error ? e.message : 'Could not start the payment.'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-text!">
            <CreditCard size={16} /> Online Payment{data?.invoiceRef ? ` — ${data.invoiceRef}` : ''}
          </h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-text-faint hover:bg-surface-hover">
            <X size={16} />
          </button>
        </div>

        {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
        {isError && <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load the payment gateway.'}</p>}

        {data && (
          <>
            {data.sandbox && (
              <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text!">
                <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warning" />
                <span>{data.sandboxWarning || 'The gateway is in sandbox mode: no real money moves, but a successful test payment still marks the invoice paid.'}</span>
              </p>
            )}
            {!data.ready && <p className="text-sm text-danger">The {data.gatewayName || 'payment'} gateway is not configured{data.missing.length ? `: ${data.missing.join(', ')}` : ''}.</p>}
            {!data.payable && data.blockedBy.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-text-muted">
                {data.blockedBy.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}

            {data.payable && data.ready && !reference && (
              <div className="space-y-2">
                <p className="text-sm text-text-muted">
                  Outstanding: <span className="font-semibold text-text!">{formatMoney(data.remaining)} {data.currency}</span>. The customer pays in {data.gatewayName}'s own window.
                </p>
                <label className="block text-xs font-medium text-text-muted">
                  Amount to collect
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount === '' ? String(data.remaining) : amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text"
                  />
                </label>
                <button
                  type="button"
                  disabled={start.isPending || !(pay > 0)}
                  onClick={begin}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {start.isPending && <LoaderCircle size={14} className="animate-spin" />} Open {data.gatewayName} checkout
                </button>
              </div>
            )}

            {reference && (
              <div className="space-y-2 text-sm">
                {status.data?.paid ? (
                  <p className="font-medium text-success">Payment received and recorded on the invoice.</p>
                ) : status.data?.state === 'ABANDONED' ? (
                  <p className="text-text-muted">This attempt was cancelled.</p>
                ) : (
                  <p className="flex items-center gap-2 text-text-muted">
                    <LoaderCircle size={14} className="animate-spin" /> Waiting for the payment to be completed in the checkout window…
                  </p>
                )}
                {!status.data?.paid && status.data?.state !== 'ABANDONED' && (
                  <div className="flex gap-2">
                    {status.data?.checkoutUrl && (
                      <a href={checkoutHref(status.data.checkoutUrl)} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover">
                        Reopen checkout
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(reference, { onSuccess: () => setReference(undefined) })}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
                    >
                      Cancel attempt
                    </button>
                  </div>
                )}
              </div>
            )}

            {message && <p role="alert" className="text-sm text-danger">{message}</p>}

            {data.attempts.length > 0 && (
              <div className="border-t border-border pt-2">
                <p className="mb-1 text-xs font-medium text-text-muted">Previous attempts</p>
                <ul className="space-y-0.5 text-xs text-text-muted">
                  {data.attempts.slice(0, 5).map((a) => (
                    <li key={a.reference} className="flex justify-between gap-2">
                      <span className="truncate">{a.created}</span>
                      <span>{formatMoney(a.amount)} {a.currency} · {a.state || a.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
