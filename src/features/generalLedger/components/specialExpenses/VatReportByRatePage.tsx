import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ChevronLeft, ChevronRight, Loader2, Plus, Search, X } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { ROUTES } from '../../../../routes'
import { useVatByRate, useVatRateDetail, type VatRateFilters } from '../../vatReportByRate.queries'
import type { VatRateRow } from '../../vatReportByRateParser'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'font-medium px-3 py-2 text-xs uppercase tracking-wide text-text-faint'
const num = 'px-3 py-2 text-right tabular-nums'

// "MM/dd/yyyy-MM/dd/yyyy" (the backend's own range format) <-> two ISO dates.
const splitPeriod = (p: string): [string, string] => {
  const m = p.match(/^(\d{2})\/(\d{2})\/(\d{4})-(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? [`${m[3]}-${m[1]}-${m[2]}`, `${m[6]}-${m[4]}-${m[5]}`] : ['', '']
}
const joinPeriod = (a: string, b: string) => {
  const f = (iso: string) => {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
  }
  return f(a) && f(b) ? `${f(a)}-${f(b)}` : ''
}

// Right-hand panel — the original page's "+" offcanvas.
function DetailDrawer({ row, filters, onClose }: { row: VatRateRow; filters: VatRateFilters; onClose: () => void }) {
  const { data, isLoading, isError, error } = useVatRateDetail(row.detailId, filters)
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-5xl overflow-y-auto bg-white p-5 shadow-xl dark:bg-gray-950" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-text!">
              VAT rate: {row.rate}
              {row.code ? ` (${row.code})` : ''}
            </h3>
            {data?.period && <p className="text-xs text-text-muted">For the period of {data.period}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-text-muted">
            <Loader2 size={16} className="animate-spin" /> Loading invoice lines…
          </div>
        )}
        {isError && <p className="py-6 text-sm text-danger">{error instanceof Error ? error.message : 'Could not load the lines.'}</p>}
        {data && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left">
                  <th className={th}>Ref</th>
                  <th className={th}>Receipt No</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Date</th>
                  <th className={th}>Product/service</th>
                  <th className={`${th} text-right`}>Excl. tax</th>
                  <th className={`${th} text-right`}>VAT</th>
                  <th className={`${th} text-right`}>Inc. tax</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-5 text-center italic text-text-faint">
                      No invoice lines.
                    </td>
                  </tr>
                )}
                {data.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-text!">{r.ref}</td>
                    <td className="px-3 py-2 text-text-muted">{r.receiptNo || '—'}</td>
                    <td className="px-3 py-2">
                      {r.customerId ? (
                        <Link to={ROUTES.customerDetail.replace(':id', r.customerId)} className="text-brand hover:underline">
                          {r.customer}
                        </Link>
                      ) : (
                        r.customer
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-text-muted">{r.date}</td>
                    <td className="px-3 py-2">
                      {r.product}
                      {r.productRef && <span className="block text-xs text-text-faint">Ref: {r.productRef}</span>}
                    </td>
                    <td className={num}>{r.excl}</td>
                    <td className={num}>{r.vat}</td>
                    <td className={num}>{r.incl}</td>
                  </tr>
                ))}
              </tbody>
              {data.totals && (
                <tfoot>
                  <tr className="border-t border-border bg-surface font-semibold text-text!">
                    <td colSpan={5} className="px-3 py-2 text-right">
                      Total
                    </td>
                    <td className={num}>{data.totals.excl}</td>
                    <td className={num}>{data.totals.vat}</td>
                    <td className={num}>{data.totals.incl}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// compta/tva/quadri_detail.php — the real "SALE TAX REPORT BY RATES" (see
// vatReportByRateParser.ts). Filters re-query the backend; search and page
// size work on the returned rows; "+" opens that rate's invoice lines.
export function VatReportByRatePage() {
  const [applied, setApplied] = useState<VatRateFilters>({ period: '', invoiceType: 'customer', status: 'All' })
  const [draft, setDraft] = useState<VatRateFilters | null>(null)
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<VatRateRow | null>(null)
  const { data, isLoading, isFetching, isError, error, refetch } = useVatByRate(applied)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.rows ?? []).filter((r) => !q || [r.rate, r.code, r.excl, r.vat, r.incl].some((v) => v.toLowerCase().includes(q)))
  }, [data, search])

  if (isLoading) return <LegacyLoadingCard label="Loading tax report…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the tax report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const form = draft ?? { period: data.period, invoiceType: data.invoiceType, status: data.status }
  const patch = (p: Partial<VatRateFilters>) => setDraft({ ...form, ...p })
  const [from, to] = splitPeriod(form.period)
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const cur = Math.min(page, pages - 1)
  const visible = filtered.slice(cur * pageSize, cur * pageSize + pageSize)
  const shownFrom = filtered.length === 0 ? 0 : cur * pageSize + 1

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Sale tax report by rates
      </h2>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-4 items-end">
          <div>
            <p className="text-xs font-medium text-text-faint mb-1">Report period</p>
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => patch({ period: joinPeriod(e.target.value, to) })} className={`${inputCls} w-full`} />
              <span className="text-text-faint">–</span>
              <input type="date" value={to} onChange={(e) => patch({ period: joinPeriod(from, e.target.value) })} className={`${inputCls} w-full`} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-faint mb-1">Invoice type</p>
            <select value={form.invoiceType} onChange={(e) => patch({ invoiceType: e.target.value })} className={`${inputCls} w-full`}>
              {data.invoiceTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-text-faint mb-1">ZRA status</p>
            <select value={form.status} onChange={(e) => patch({ status: e.target.value })} className={`${inputCls} w-full`}>
              {data.statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => {
              setApplied(form)
              setPage(0)
            }}
            className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {isFetching && <Loader2 size={14} className="animate-spin" />} View Report
          </button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setPage(0)
          }}
          className={inputCls}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-56 max-w-xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Search"
            className={`${inputCls} w-full pl-9`}
          />
        </div>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className={th}>VAT rate</th>
                <th className={th}>VAT code</th>
                <th className={`${th} text-right`}>Amount (excl. tax)</th>
                <th className={`${th} text-right`}>VAT amount</th>
                <th className={`${th} text-right`}>Amount (inc. tax)</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center italic text-text-faint">
                    No data for this period.
                  </td>
                </tr>
              )}
              {visible.map((r, i) => (
                <tr key={`${r.detailId}-${i}`} className="border-b border-border">
                  <td className="px-3 py-2 font-medium text-text!">{r.rate}</td>
                  <td className="px-3 py-2 text-text-muted">{r.code || '—'}</td>
                  <td className={num}>{r.excl}</td>
                  <td className={num}>{r.vat}</td>
                  <td className={num}>{r.incl}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => setOpen(r)} title="View invoice lines" className="grid h-7 w-7 place-items-center rounded-md bg-brand text-white hover:bg-brand-hover">
                      <Plus size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {data.totals && (
              <tfoot>
                <tr className="bg-surface font-semibold text-text!">
                  <td colSpan={2} className="px-3 py-2">
                    TOTAL
                  </td>
                  <td className={num}>{data.totals.excl}</td>
                  <td className={num}>{data.totals.vat}</td>
                  <td className={num}>{data.totals.incl}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
        <span>
          Showing {shownFrom} to {Math.min(filtered.length, cur * pageSize + pageSize)} of {filtered.length} entries
        </span>
        <div className="flex items-center gap-1">
          <button type="button" disabled={cur === 0} onClick={() => setPage(cur - 1)} className="grid h-8 w-8 place-items-center rounded-md border border-border disabled:opacity-40">
            <ChevronLeft size={15} />
          </button>
          <span className="grid h-8 min-w-8 place-items-center rounded-md bg-brand px-2 text-white">{cur + 1}</span>
          <button type="button" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="grid h-8 w-8 place-items-center rounded-md border border-border disabled:opacity-40">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {open && <DetailDrawer row={open} filters={applied.period ? applied : { ...applied, period: data.period }} onClose={() => setOpen(null)} />}
    </div>
  )
}
