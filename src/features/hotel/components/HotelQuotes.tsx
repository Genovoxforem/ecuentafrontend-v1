import { useEffect, useMemo, useState } from 'react'
import { FileSignature, LoaderCircle, X, Settings } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useHotelQuotes,
  useHotelQuoteCatalog,
  useHotelCustomerSearch,
  useHotelSaveQuote,
  useHotelQuoteStatus,
  useHotelSendQuote,
  useHotelConvertQuote,
  useHotelDelQuote,
  useHotelQuoteDetail,
  useHotelQuoteCfg,
  useHotelSaveQuoteCfg,
  useHotelToken,
} from '../hotel.queries'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm'
const STATE_TAG: Record<string, string> = {
  draft: 'bg-neutral-bg text-neutral-fg',
  sent: 'bg-info-bg text-info-fg',
  accepted: 'bg-success-bg text-success-fg',
  declined: 'bg-warning-bg text-warning-fg',
  expired: 'bg-warning-bg text-warning-fg',
  converted: 'bg-success-bg text-success-fg',
}
const STATE_LABEL: Record<string, string> = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined', expired: 'Expired', converted: 'Converted' }

function todayIso(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

// New/edit quotation, simplified to a single room-type line (real dates,
// real guest lookup, real room-type + rate from quotecatalog, real
// a=savequote write) — the original SPA supports multiple room lines each
// with their own add-on services; that per-line service editor isn't
// wired here, everything else about the write is genuine.
function QuoteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data: token } = useHotelToken()
  const { data: catalog } = useHotelQuoteCatalog()
  const save = useHotelSaveQuote()

  const [guestQuery, setGuestQuery] = useState('')
  const [socId, setSocId] = useState('')
  const [ci, setCi] = useState(todayIso())
  const [co, setCo] = useState(todayIso(3))
  const [validity, setValidity] = useState(todayIso(7))
  const [roomId, setRoomId] = useState('')
  const [rate, setRate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const { data: results } = useHotelCustomerSearch(guestQuery)

  const nights = useMemo(() => Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000)), [ci, co])

  function handleRoomChange(id: string) {
    setRoomId(id)
    const r = catalog?.rooms.find((x) => x.id === id)
    if (r?.price) setRate(String(r.price))
  }

  function handleSave() {
    if (!socId) return setError('Pick a guest.')
    if (!roomId) return setError('Pick a room type.')
    if (!token) return
    const lines = `${roomId}:1:${nights}:${rate || 0}`
    save.mutate({ socid: socId, ci, co, validity, notes, lines, token }, { onSuccess: onSaved, onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-surface border border-border shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">New Quotation</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <input
              value={guestQuery}
              onChange={(e) => {
                setGuestQuery(e.target.value)
                setSocId('')
              }}
              placeholder="Search guest by name / phone / email"
              className={`w-full ${fieldCls}`}
            />
            {guestQuery.trim().length >= 2 && !socId && results && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-surface border border-border rounded-lg shadow-lg max-h-40 overflow-auto">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSocId(r.id)
                      setGuestQuery(r.name)
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover border-b border-border last:border-0"
                  >
                    {r.name} <span className="text-text-faint text-xs">{r.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-faint">Check-in</span>
              <input type="date" value={ci} onChange={(e) => setCi(e.target.value)} className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-faint">Check-out</span>
              <input type="date" value={co} min={ci} onChange={(e) => setCo(e.target.value)} className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-faint">Valid until</span>
              <input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} className={fieldCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-faint">Room type</span>
              <select value={roomId} onChange={(e) => handleRoomChange(e.target.value)} className={fieldCls}>
                <option value="">Select…</option>
                {(catalog?.rooms ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-faint">Rate K/night</span>
              <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className={fieldCls} />
            </label>
          </div>
          <p className="text-xs text-text-faint">
            {nights} night{nights === 1 ? '' : 's'} · estimated K{((Number(rate) || 0) * nights).toLocaleString()} + tourism levy &amp; VAT
          </p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes / terms (shown on quote PDF)" rows={2} className="w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={!token || save.isPending}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {save.isPending && <LoaderCircle size={13} className="animate-spin" />} Save draft
          </button>
        </div>
      </div>
    </div>
  )
}

// r=quote&id=X — the real quotation detail (list rows from r=quotes only
// carry the summary fields already shown in the table below).
function QuoteDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading, isError, error } = useHotelQuoteDetail(id)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-surface border border-border shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">Quotation {data?.quote.quo || data?.quote.ref || `#${id}`}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {isLoading && <p className="text-sm text-text-faint text-center py-4">Loading…</p>}
          {isError && <p className="text-sm text-danger-fg text-center py-4">{error instanceof Error ? error.message : 'Could not load this quote.'}</p>}
          {data && (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-text-faint">Guest</p>
                  <p className="text-text!">{data.quote.guest || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Status</p>
                  <p className="text-text!">{data.quote.state || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Stay</p>
                  <p className="text-text!">
                    {data.quote.ci || '—'} → {data.quote.co || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Valid until</p>
                  <p className="text-text!">{data.quote.valid_raw || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Total (excl. tax)</p>
                  <p className="text-text!">K{Number(data.quote.ht ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Total (incl. tax)</p>
                  <p className="text-text!">K{Number(data.quote.ttc ?? 0).toLocaleString()}</p>
                </div>
              </div>
              {data.quote.notes && (
                <div>
                  <p className="text-xs text-text-faint mb-1">Notes</p>
                  <p className="text-sm text-text-muted whitespace-pre-wrap">{data.quote.notes}</p>
                </div>
              )}
              <div className="border-t border-border pt-2">
                <p className="text-xs text-text-faint mb-1.5">Lines</p>
                {data.lines.length === 0 ? (
                  <p className="text-sm text-text-faint italic">No lines.</p>
                ) : (
                  data.lines.map((l, i) => (
                    <div key={l.id ?? i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                      <span className="text-text-muted">
                        {l.label || l.descr || 'Line'} {l.qty && Number(l.qty) !== 1 ? `×${l.qty}` : ''}
                      </span>
                      <span className="text-text!">K{Number(l.total ?? 0).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// r=quotecfg + a=savequotecfg — the default validity window & boilerplate
// terms every new quote (QuoteModal above) is pre-filled from.
function QuoteCfgModal({ onClose }: { onClose: () => void }) {
  const { data: token } = useHotelToken()
  const { data: cfg } = useHotelQuoteCfg()
  const save = useHotelSaveQuoteCfg()
  const [days, setDays] = useState('')
  const [terms, setTerms] = useState('')

  useEffect(() => {
    if (cfg) {
      setDays(String(cfg.validity_days ?? ''))
      setTerms(cfg.terms ?? '')
    }
  }, [cfg])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">Quotation Settings</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="block">
            <span className="block text-xs text-text-faint mb-1">Default validity (days)</span>
            <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className={`w-full ${fieldCls}`} />
          </label>
          <label className="block">
            <span className="block text-xs text-text-faint mb-1">Default terms</span>
            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          </label>
          {save.isError && <p className="text-xs text-danger-fg">{save.error instanceof Error ? save.error.message : 'Failed.'}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={!token || save.isPending}
            onClick={() => token && save.mutate({ validityDays: Number(days) || 2, terms, token }, { onSuccess: onClose })}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {save.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// Real via custom/hotel/api.php?r=quotes|quotecatalog|quote|quotecfg, plus
// a=savequote/quotestatus/sendquote/convertquote/delquote/savequotecfg —
// the Hotel Suite app's own Quotations view.
export function HotelQuotes() {
  const { data: token } = useHotelToken()
  const { data: quotes, isLoading, isError, error, refetch } = useHotelQuotes()
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const status = useHotelQuoteStatus()
  const send = useHotelSendQuote()
  const convert = useHotelConvertQuote()
  const del = useHotelDelQuote()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [showCfg, setShowCfg] = useState(false)

  const filtered = (quotes ?? []).filter((q) => !filter || q.state === filter)

  function act(id: string, fn: () => void) {
    setBusyId(id)
    fn()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <FileSignature size={22} />
          </span>
          <h2 className="text-lg font-bold text-text!">Quotations</h2>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={fieldCls}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>
          <button type="button" onClick={() => setShowCfg(true)} title="Quotation settings" className="rounded-md border border-input-border p-2 text-text-muted hover:bg-surface-hover">
            <Settings size={15} />
          </button>
          <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
            + New Quotation
          </button>
        </div>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading quotations…" />}
      {isError && <LegacyErrorCard title="Couldn't load quotations" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {quotes && (
        <Card className="!h-auto !p-0 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No quotations{filter ? ` (${filter})` : ''}. Tap "+ New Quotation".</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-3 py-2">Quote</th>
                  <th className="font-medium px-3 py-2">Guest</th>
                  <th className="font-medium px-3 py-2">Created</th>
                  <th className="font-medium px-3 py-2">Valid until</th>
                  <th className="font-medium px-3 py-2 text-right">Total</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => setViewingId(q.id)} className="text-text! font-medium hover:underline">
                        {q.quo || q.ref || `#${q.id}`}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-text-muted">{q.guest || '—'}</td>
                    <td className="px-3 py-2.5 text-text-muted">{q.created || '—'}</td>
                    <td className="px-3 py-2.5 text-text-muted">{q.valid_fmt || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-text!">K{Number(q.total).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATE_TAG[q.state] ?? 'bg-neutral-bg text-neutral-fg'}`}>{STATE_LABEL[q.state] ?? q.state}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      {busyId === q.id && (status.isPending || send.isPending || convert.isPending || del.isPending) ? (
                        <LoaderCircle size={13} className="inline animate-spin text-text-faint" />
                      ) : (
                        <>
                          {q.state === 'draft' && (
                            <>
                              <button
                                type="button"
                                disabled={!token}
                                onClick={() => token && act(q.id, () => send.mutate({ id: q.id, token }))}
                                className="text-xs text-brand hover:underline mr-2"
                              >
                                Send
                              </button>
                              <button
                                type="button"
                                disabled={!token}
                                onClick={() => token && confirm('Delete this draft quote?') && act(q.id, () => del.mutate({ id: q.id, token }))}
                                className="text-xs text-danger hover:underline"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {q.state === 'sent' && (
                            <>
                              <button
                                type="button"
                                disabled={!token}
                                onClick={() => token && confirm('Mark this quote as accepted by the guest?') && act(q.id, () => status.mutate({ id: q.id, to: 'accepted', token }))}
                                className="text-xs text-success-fg hover:underline mr-2"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                disabled={!token}
                                onClick={() => token && confirm('Mark this quote as declined?') && act(q.id, () => status.mutate({ id: q.id, to: 'declined', token }))}
                                className="text-xs text-danger hover:underline"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {q.state === 'accepted' && (
                            <button
                              type="button"
                              disabled={!token}
                              onClick={() =>
                                token &&
                                confirm('Convert this accepted quote into a confirmed booking?\nRooms of each quoted type will be auto-assigned for the stay dates.') &&
                                act(q.id, () => convert.mutate({ id: q.id, token }))
                              }
                              className="text-xs text-white bg-brand rounded-md px-2 py-1"
                            >
                              Convert to booking
                            </button>
                          )}
                          {(q.state === 'expired' || q.state === 'declined') && (
                            <button
                              type="button"
                              disabled={!token}
                              onClick={() => token && act(q.id, () => status.mutate({ id: q.id, to: 'draft', token }))}
                              className="text-xs text-brand hover:underline"
                            >
                              Reopen
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {showModal && <QuoteModal onClose={() => setShowModal(false)} onSaved={() => setShowModal(false)} />}
      {viewingId && <QuoteDetailModal id={viewingId} onClose={() => setViewingId(null)} />}
      {showCfg && <QuoteCfgModal onClose={() => setShowCfg(false)} />}
    </div>
  )
}
