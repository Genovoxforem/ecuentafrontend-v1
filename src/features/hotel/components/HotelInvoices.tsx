import { useState } from 'react'
import { FileText, Eye, FileDown, LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelInvoices, useHotelCreditNotes, useHotelInvZraSync, useHotelToken, fetchHotelInvoicePdfUrl } from '../hotel.queries'

const STATUS_TAG: Record<number, string> = { 0: 'bg-neutral-bg text-neutral-fg', 1: 'bg-warning-bg text-warning-fg', 3: 'bg-neutral-bg text-neutral-fg' }
const STATUS_LABEL: Record<number, string> = { 0: 'Draft', 1: 'Unpaid', 3: 'Void' }

function openInvoiceCard(id: string) {
  window.open(`/compta/facture/card.php?facid=${id}&save_lastsearch_values=1`, '_blank', 'noopener')
}
// r=invoicepdf&booking=X — real (confirmed live; keyed by the booking
// number, not the invoice id, and returns {ok,url} to open rather than
// being a direct PDF route itself). Replaces a guessed
// /custom/hotel/invoicepdf.php?id=X URL that 403s — confirmed live it
// doesn't exist on this backend.
async function viewInvoicePdf(bnum: string | null) {
  if (!bnum) {
    window.alert('No linked booking for this invoice — cannot look up its PDF.')
    return
  }
  try {
    const url = await fetchHotelInvoicePdfUrl(bnum)
    window.open(url, '_blank', 'noopener')
  } catch (e) {
    window.alert(e instanceof Error ? e.message : 'No invoice PDF available.')
  }
}

// Real via custom/hotel/api.php?r=invoices|creditnotes|invoicepdf, plus
// a=invzrasync — the Hotel Suite app's own Invoices & Folios / Credit
// Notes view. "View invoice" opens the real Dolibarr invoice card; "PDF"
// now genuinely calls r=invoicepdf (see viewInvoicePdf's own comment).
export function HotelInvoices() {
  const { data: token } = useHotelToken()
  const [tab, setTab] = useState<'inv' | 'cn'>('inv')
  const invoices = useHotelInvoices()
  const creditNotes = useHotelCreditNotes()
  const zraSync = useHotelInvZraSync()

  const active = tab === 'inv' ? invoices : creditNotes

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
          <FileText size={22} />
        </span>
        <h2 className="text-lg font-bold text-text!">Invoices</h2>
      </div>

      <div className="flex gap-5 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('inv')}
          className={`pb-2.5 text-sm font-medium border-b-2 -mb-px ${tab === 'inv' ? 'text-text! border-brand' : 'text-text-faint border-transparent'}`}
        >
          Invoices &amp; Folios
        </button>
        <button
          type="button"
          onClick={() => setTab('cn')}
          className={`pb-2.5 text-sm font-medium border-b-2 -mb-px ${tab === 'cn' ? 'text-text! border-brand' : 'text-text-faint border-transparent'}`}
        >
          Credit Notes
        </button>
      </div>

      {active.isLoading && <LegacyLoadingCard label="Loading…" />}
      {active.isError && <LegacyErrorCard title="Couldn't load" message={active.error instanceof Error ? active.error.message : 'Unknown error.'} onRetry={() => active.refetch()} />}

      {active.data && (
        <Card className="!h-auto !p-0 overflow-hidden">
          {active.data.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">
              {tab === 'inv' ? 'No invoices yet — generate one from a guest folio in Front Desk.' : 'No credit notes yet.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-3 py-2">Invoice</th>
                  <th className="font-medium px-3 py-2">Guest</th>
                  <th className="font-medium px-3 py-2">Booking</th>
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2 text-right">Total</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2">ZRA</th>
                  <th className="font-medium px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {active.data.map((r) => {
                  const zraSynced = r.zracode === '000'
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5">
                        <button type="button" onClick={() => viewInvoicePdf(r.bnum)} className="text-brand font-medium hover:underline">
                          {r.ref}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-text-muted">{r.guest || '—'}</td>
                      <td className="px-3 py-2.5 text-text-muted">{r.bnum || '—'}</td>
                      <td className="px-3 py-2.5 text-text-muted">{r.date}</td>
                      <td className="px-3 py-2.5 text-right text-text!">K{Number(r.total).toLocaleString()}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.paye === 1 ? 'bg-success-bg text-success-fg' : (STATUS_TAG[r.status] ?? 'bg-info-bg text-info-fg')}`}>
                          {r.paye === 1 ? 'Paid' : STATUS_LABEL[r.status] ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {zraSynced ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success-bg text-success-fg">Synced</span>
                        ) : r.zracode && r.status > 0 ? (
                          <button
                            type="button"
                            disabled={!token || zraSync.isPending}
                            onClick={() => token && zraSync.mutate({ id: r.id, token })}
                            className="text-xs text-brand hover:underline disabled:opacity-50"
                          >
                            {zraSync.isPending ? <LoaderCircle size={11} className="inline animate-spin" /> : 'Update to ZRA'}
                          </button>
                        ) : (
                          <span className="text-xs text-text-faint">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <button type="button" onClick={() => openInvoiceCard(r.id)} title="View invoice" className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover">
                          <Eye size={14} />
                        </button>
                        <button type="button" onClick={() => viewInvoicePdf(r.bnum)} title="PDF" className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover">
                          <FileDown size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}
