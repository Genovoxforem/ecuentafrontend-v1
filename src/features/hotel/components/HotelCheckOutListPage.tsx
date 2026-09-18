import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Plus, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { useHotelCheckouts, useHotelInvoices } from '../hotel.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type PayStatus = { label: string; cls: string }
function payStatusFor(inv: { paye: 0 | 1; paid: number; total: number } | undefined): PayStatus {
  if (!inv) return { label: 'Not invoiced', cls: 'bg-neutral-bg text-neutral-fg' }
  if (inv.paye === 1 || inv.paid >= inv.total) return { label: 'Paid', cls: 'bg-success-bg text-success-fg' }
  if (inv.paid > 0) return { label: 'Partial', cls: 'bg-warning-bg text-warning-fg' }
  return { label: 'Unpaid', cls: 'bg-danger-bg text-danger-fg' }
}

// Real page: booking/reservation/checkout_list.php — this uses custom/hotel/
// api.php?r=checkouts (already checked-out bookings only), cross-referenced
// with r=invoices by bnum===num to derive Payment Status (paye/paid/total),
// since checkouts itself carries no payment field of its own. "Booking Date"
// (the classic page's own column) has no equivalent in either real
// resource — checkouts only returns check-in/check-out dates, not a
// separate reservation-created date — so that column is honestly shown as
// "—" rather than reusing check-in date under a different label. "+ADD
// Booking" goes to the same real New Booking page the Booking/Check-In List
// page already uses. Status is fixed "Checked Out" since r=checkouts is
// inherently that slice already; Action links to the matched invoice when
// one exists (this Suite has no per-invoice detail route, so it opens the
// Invoices list).
export function HotelCheckOutListPage() {
  const { data: checkouts, isLoading, isError, error, refetch } = useHotelCheckouts()
  const { data: invoices } = useHotelInvoices()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const invoiceByBooking = useMemo(() => {
    const map = new Map<string, { paye: 0 | 1; paid: number; total: number; ref: string }>()
    for (const inv of invoices ?? []) {
      if (inv.bnum) map.set(inv.bnum, { paye: inv.paye, paid: inv.paid, total: inv.total, ref: inv.ref })
    }
    return map
  }, [invoices])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = checkouts ?? []
    if (!q) return rows
    return rows.filter((c) => `${c.num} ${c.guest} ${c.rooms}`.toLowerCase().includes(q))
  }, [checkouts, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Sl.No', 'Booking Number', 'Room Number', 'Customer Name', 'Check In', 'Check Out', 'Total Amount', 'Payment Status', 'Status'],
      rows: filtered.map((c, i) => {
        const pay = payStatusFor(invoiceByBooking.get(c.num))
        return [String(i + 1), c.num, c.rooms || '—', c.guest || '—', c.ci, c.cout || c.co, String(c.total ?? 0), pay.label, 'Checked Out']
      }),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
              <LogOut size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text!">Check Out List</h2>
              <p className="text-xs text-text-faint mt-0.5">{checkouts ? `${checkouts.length} checkouts` : ''}</p>
            </div>
          </div>
          <Link to={ROUTES.hotelNewBooking} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> ADD Booking
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading checkouts…" />}
        {isError && <LegacyErrorCard title="Couldn't load checkouts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">booking/reservation/checkout_list.php</code>. Booking Date isn't returned by the real Hotel Suite API
            for checked-out bookings, so it's shown as "—" rather than substituting a different date under that label. Payment Status is derived from the
            matching invoice (if one has been raised for this booking).
          </p>
        </Card>

        {checkouts && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
              <h3 className="font-semibold text-text!">Checkouts</h3>
              <div className="flex items-center gap-2">
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search"
                  className={`w-64 ${inputCls}`}
                />
                <TableExportButtons title="Check Out List" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{checkouts.length === 0 ? 'No Data Available In Table' : 'No checkouts match this search.'}</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Sl.No</th>
                      <th className="font-medium px-3 py-2">Booking Number</th>
                      <th className="font-medium px-3 py-2">Booking Date</th>
                      <th className="font-medium px-3 py-2">Room Number</th>
                      <th className="font-medium px-3 py-2">Customer Name</th>
                      <th className="font-medium px-3 py-2">Check In</th>
                      <th className="font-medium px-3 py-2">Check Out</th>
                      <th className="font-medium px-3 py-2 text-right">Total Amount</th>
                      <th className="font-medium px-3 py-2">Payment Status</th>
                      <th className="font-medium px-3 py-2">Status</th>
                      <th className="font-medium px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((c, i) => {
                      const inv = invoiceByBooking.get(c.num)
                      const pay = payStatusFor(inv)
                      return (
                        <tr key={c.num} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                          <td className="px-3 py-2.5 text-text! font-medium">{c.num}</td>
                          <td className="px-3 py-2.5 text-text-faint">—</td>
                          <td className="px-3 py-2.5 text-text-muted">{c.rooms || '—'}</td>
                          <td className="px-3 py-2.5 text-text-muted">{c.guest || '—'}</td>
                          <td className="px-3 py-2.5 text-text-muted">{c.ci}</td>
                          <td className="px-3 py-2.5 text-text-muted">{c.cout || c.co}</td>
                          <td className="px-3 py-2.5 text-right text-text!">K{Number(c.total ?? 0).toLocaleString()}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${pay.cls}`}>{pay.label}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-bg text-neutral-fg">Checked Out</span>
                          </td>
                          <td className="px-3 py-2.5">
                            {inv ? (
                              <Link to={ROUTES.hotelInvoices} className="text-xs text-brand hover:underline">
                                View Invoice ({inv.ref})
                              </Link>
                            ) : (
                              <span className="text-xs text-text-faint">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {checkouts && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
