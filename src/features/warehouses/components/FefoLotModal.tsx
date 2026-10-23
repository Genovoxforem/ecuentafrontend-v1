import { useState } from 'react'
import { Check, Loader2, RotateCcw, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { useFefoLotAction, useFefoLotDetail, useWriteOffLot, type FefoData, type FefoLotRow } from '../fefo.queries'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const btnCls = 'inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50'
const ghostBtnCls = 'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h4>
      {children}
    </section>
  )
}

// Everything the FEFO endpoint can do to one lot: write stock off (straight away for someone who may, otherwise as a
// request), approve or reject the requests waiting on it, reverse an executed write-off, hold or release it in
// quarantine, and correct its dates (which the endpoint also copies onto the batch and the receipts).
export function FefoLotModal({ row, rights, onClose }: { row: FefoLotRow; rights: Pick<FefoData, 'canWriteOff' | 'canWrite' | 'canApprove' | 'canReverse'>; onClose: () => void }) {
  const lotId = row.lotId
  const detail = useFefoLotDetail(lotId)
  const act = useFefoLotAction()
  const writeOff = useWriteOffLot()
  const [qty, setQty] = useState(String(row.qty))
  const [reason, setReason] = useState('Expired')
  const [note, setNote] = useState('')
  const [eatby, setEatby] = useState(row.eatByDate)
  const [sellby, setSellby] = useState(row.sellByDate)
  const [allowPast, setAllowPast] = useState(row.status === 'Expired')
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const busy = act.isPending || writeOff.isPending
  const fail = (e: unknown) => setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'The request failed.' })
  const run = (promise: Promise<unknown>, done: string) => {
    setMessage(null)
    return promise.then(() => setMessage({ tone: 'ok', text: done })).catch(fail)
  }

  const quantity = Number(qty)
  const qtyOk = quantity > 0 && quantity <= row.qty
  const canSubmitWriteOff = lotId !== null && row.warehouseId !== null && qtyOk && reason.trim() !== ''

  function submitWriteOff() {
    if (!canSubmitWriteOff || lotId === null || row.warehouseId === null) return
    if (rights.canWriteOff) {
      void run(writeOff.mutateAsync({ lotId, warehouseId: row.warehouseId, qty: quantity, reason: reason.trim() }), 'Stock written off.')
    } else {
      void run(act.mutateAsync({ action: 'request_writeoff', lotId, warehouseId: row.warehouseId, qty: quantity, reason: reason.trim() }), 'Write-off requested. It is waiting for approval.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-border px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-text!">{row.label}</h3>
            <p className="text-xs text-text-muted">
              Lot {row.lotSerial || '—'} · {row.warehouse || '—'} · {row.qty.toFixed(2)} units · {row.status}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {message && (
            <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md px-3 py-2 text-sm ${message.tone === 'error' ? 'bg-danger-bg text-danger-fg' : 'bg-success-bg text-success-fg'}`}>
              {message.text}
            </p>
          )}
          {lotId === null && <p className="text-sm text-text-muted">This row has no lot record, so it cannot be managed here.</p>}

          {lotId !== null && (
            <>
              <Section title={rights.canWriteOff ? 'Write off stock' : 'Request a write-off'}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="text-xs text-text-faint">
                    Quantity (max {row.qty})
                    <input type="number" min={0} max={row.qty} step="any" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
                  </label>
                  <label className="text-xs text-text-faint sm:col-span-2">
                    Reason
                    <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
                  </label>
                </div>
                {!qtyOk && qty !== '' && <p className="text-xs text-danger">Enter a quantity above 0 and no more than the lot holds.</p>}
                <button type="button" disabled={!canSubmitWriteOff || busy || (!rights.canWriteOff && !rights.canWrite)} onClick={submitWriteOff} className={btnCls}>
                  {busy && <Loader2 size={12} className="animate-spin" />}
                  {rights.canWriteOff ? 'Write off' : 'Send request'}
                </button>
              </Section>

              {detail.isLoading && (
                <p className="flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 size={14} className="animate-spin" /> Loading the lot's history…
                </p>
              )}
              {detail.isError && <p className="text-sm text-danger">{detail.error instanceof Error ? detail.error.message : "Couldn't load the lot's history."}</p>}

              {detail.data && (
                <>
                  <Section title={`Waiting for approval (${detail.data.requests.length})`}>
                    {detail.data.requests.length === 0 ? (
                      <p className="text-sm text-text-faint italic">No requests are waiting.</p>
                    ) : (
                      <ul className="divide-y divide-border rounded-md border border-border">
                        {detail.data.requests.map((r) => (
                          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="text-text">
                              {r.qty} units{r.warehouse ? ` from ${r.warehouse}` : ''} — {r.reason || 'no reason given'}
                              <span className="block text-xs text-text-faint">
                                {[r.requestedBy, r.requestedAt].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            {rights.canApprove && (
                              <span className="flex gap-2">
                                <button type="button" disabled={busy} className={btnCls} onClick={() => run(act.mutateAsync({ action: 'approve_writeoff', lotId, requestId: r.id }), 'Request approved and the stock written off.')}>
                                  <Check size={12} /> Approve
                                </button>
                                <button type="button" disabled={busy} className={ghostBtnCls} onClick={() => run(act.mutateAsync({ action: 'reject_writeoff', lotId, requestId: r.id, note: note.trim() || 'Rejected' }), 'Request rejected.')}>
                                  <X size={12} /> Reject
                                </button>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {rights.canApprove && detail.data.requests.length > 0 && (
                      <label className="block text-xs text-text-faint">
                        Review note (used when rejecting)
                        <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
                      </label>
                    )}
                  </Section>

                  <Section title={`Write-off history (${detail.data.history.length})`}>
                    {detail.data.history.length === 0 ? (
                      <p className="text-sm text-text-faint italic">Nothing has been written off from this lot.</p>
                    ) : (
                      <ul className="divide-y divide-border rounded-md border border-border">
                        {detail.data.history.map((h) => (
                          <li key={h.index} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className={h.reversed ? 'text-text-faint line-through' : 'text-text'}>
                              {h.qty} units{h.warehouse ? ` from ${h.warehouse}` : ''} — {h.reason || 'no reason given'}
                              <span className="block text-xs text-text-faint no-underline">{[h.by, h.at].filter(Boolean).join(' · ')}</span>
                            </span>
                            {h.reversed ? (
                              <span className="text-xs text-text-faint">Reversed</span>
                            ) : (
                              rights.canReverse && (
                                <button type="button" disabled={busy} className={ghostBtnCls} onClick={() => run(act.mutateAsync({ action: 'reverse_writeoff', lotId, historyIndex: h.index, note: note.trim() || 'Manual reversal' }), 'Write-off reversed and the stock put back.')}>
                                  <RotateCcw size={12} /> Reverse
                                </button>
                              )
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>

                  <Section title="Quarantine">
                    {detail.data.quarantined ? (
                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-sm text-warning-fg">
                          <ShieldAlert size={14} /> On hold{detail.data.quarantineReason ? `: ${detail.data.quarantineReason}` : ''}
                        </p>
                        <button type="button" disabled={busy || !rights.canWrite} className={ghostBtnCls} onClick={() => run(act.mutateAsync({ action: 'release_quarantine', lotId, note: note.trim() || 'Released' }), 'Lot released from quarantine.')}>
                          <ShieldCheck size={12} /> Release from quarantine
                        </button>
                      </div>
                    ) : (
                      <button type="button" disabled={busy || !rights.canWrite} className={ghostBtnCls} onClick={() => run(act.mutateAsync({ action: 'set_quarantine', lotId, reason: reason.trim() || 'Quality hold' }), 'Lot put on quarantine hold.')}>
                        <ShieldAlert size={12} /> Put on quarantine hold
                      </button>
                    )}
                    <p className="text-xs text-text-faint">The reason above (or the review note when releasing) is saved with the hold.</p>
                  </Section>
                </>
              )}

              <Section title="Correct the dates">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs text-text-faint">
                    Eat-by
                    <input type="date" value={eatby} onChange={(e) => setEatby(e.target.value)} className={inputCls} />
                  </label>
                  <label className="text-xs text-text-faint">
                    Sell-by
                    <input type="date" value={sellby} onChange={(e) => setSellby(e.target.value)} className={inputCls} />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-xs text-text-muted">
                  <input type="checkbox" checked={allowPast} onChange={(e) => setAllowPast(e.target.checked)} />
                  Allow a date in the past (needed to correct a lot that has already expired)
                </label>
                <p className="text-xs text-text-faint">An empty date is cleared. The change is copied onto the batch and the purchase receipts.</p>
                <button type="button" disabled={busy || !rights.canWrite} className={btnCls} onClick={() => run(act.mutateAsync({ action: 'update_dates', lotId, eatby, sellby, allowPast }), 'Dates updated.')}>
                  Save dates
                </button>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
