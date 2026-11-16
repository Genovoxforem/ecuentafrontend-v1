import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Columns3, Download, Play, Printer, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { kwacha } from '../pharmacyFormat'
import { usePharmacyReport } from '../pharmacy.queries'
import { PHARMACY_FISCAL_STATUSES, PHARMACY_REPORT_FAMILIES, type PharmacyReportColumn, type PharmacyReportParams } from '../pharmacyReports'
import { GhostButton, Pill, Status, downloadCsv } from './PharmacyUi'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const monthStart = () => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const FIELD = 'h-9 w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'

interface Filters {
  from: string
  to: string
  branch: string
  medicine: string
  payment: string
  statuses: string[]
}
const initialFilters = (): Filters => ({ from: monthStart(), to: iso(new Date()), branch: '', medicine: '', payment: '', statuses: [...PHARMACY_FISCAL_STATUSES] })

const statusTone = (v: string) => (/accept|ok|done|paid/i.test(v) ? 'ok' : /review|fail|reject|error/i.test(v) ? 'bad' : 'warn')

function Cell({ col, row }: { col: PharmacyReportColumn; row: Record<string, unknown> }) {
  const v = row[col.key]
  if (v === null || v === undefined || v === '') return <>-</>
  if (col.money) return <>{kwacha(Number(v))}</>
  if (col.status) return <Pill tone={statusTone(String(v))}>{String(v)}</Pill>
  if (col.link && row[col.link]) return <Link to={ROUTES.invoiceDetail.replace(':id', String(row[col.link]))} className="text-brand hover:underline">{String(v)}</Link>
  return <>{String(v)}</>
}

// The classic Reports page: report tree on the left, the report (title, actions, tabs, KPI strip, table, paging) in the
// middle, filters on the right. Everything is read from api.php?m=reports&action=<report>, whose answer lists its own
// columns, KPI metrics and paging. Server-side PDF export, saved views, grouping and the pharmacist filter are not wired
// (their endpoints / option source were not seen).
export function PharmacyReports() {
  const [report, setReport] = useState('medicine_sales')
  const [view, setView] = useState('detail')
  const [draft, setDraft] = useState<Filters>(initialFilters)
  const [applied, setApplied] = useState<Filters>(initialFilters)
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: '', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [open, setOpen] = useState<Record<string, boolean>>({ 'Sales & Business': true })
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [showCols, setShowCols] = useState(false)

  const def = PHARMACY_REPORT_FAMILIES.flatMap((f) => f.reports).find((r) => r.key === report) ?? PHARMACY_REPORT_FAMILIES[0].reports[0]
  const family = PHARMACY_REPORT_FAMILIES.find((f) => f.reports.some((r) => r.key === def.key))?.family ?? ''

  const params: PharmacyReportParams = { view, ...applied, sort: sort.key, dir: sort.dir, page, page_size: pageSize }
  const { data, isLoading, isFetching, error, refetch } = usePharmacyReport(def.key, params)

  const pick = (key: string) => {
    setReport(key)
    setView('detail')
    setSort({ key: '', dir: 'desc' })
    setPage(1)
    setHidden(new Set())
  }
  const columns = (data?.columns ?? []).filter((c) => !hidden.has(c.key))
  const branches = (data?.branches ?? []).map((b) => (typeof b === 'string' ? { id: b, name: b } : { id: String(b.id), name: b.name }))

  const exportCsv = () => data && downloadCsv(`${def.key}.csv`, columns.map((c) => c.label), data.rows.map((r) => columns.map((c) => r[c.key])))
  const toggleSort = (c: PharmacyReportColumn) => {
    if (!c.sortable) return
    setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === 'desc' ? 'asc' : 'desc' }))
    setPage(1)
  }

  const tree = useMemo(
    () =>
      PHARMACY_REPORT_FAMILIES.map((f) => {
        const isOpen = open[f.family] ?? false
        return (
          <div key={f.family} className="border-b border-border last:border-0">
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [f.family]: !isOpen }))} className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold text-text!">
              {f.family}
              <ChevronDown size={14} className={`text-text-faint transition-transform ${isOpen ? '' : '-rotate-90'}`} />
            </button>
            {isOpen &&
              f.reports.map((r) => (
                <button key={r.key} type="button" onClick={() => pick(r.key)} className={`block w-full px-5 py-1.5 text-left text-sm ${r.key === report ? 'border-l-2 border-brand bg-brand/10 text-brand' : 'text-text-muted hover:bg-surface-hover'}`}>
                  {r.label}
                </button>
              ))}
          </div>
        )
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, report],
  )

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 xl:grid-cols-[11.5rem_1fr_12rem]">
      <div className="max-h-full min-w-0 self-start overflow-y-auto rounded-xl border border-border bg-surface-alt">
        <p className="px-3 py-3 text-sm font-bold text-text!">Reports</p>
        {tree}
        <p className="px-3 py-3 text-xs leading-relaxed text-text-faint">Live reporting derives from recorded invoice and credit-note values with explicit pharmacy-sales attribution. Reports without verified data show an integration state.</p>
      </div>

      <section className="min-h-0 min-w-0 space-y-4 overflow-y-auto pr-1">
        <div>
          <p className="text-xs text-text-faint">Reports / {family}</p>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-semibold text-text!">{def.label}</h2>
            {data?.available && <Pill tone="ok">Live{isFetching ? ' · updating' : ''}</Pill>}
          </div>
          {data && <p className="text-xs text-text-faint">{(applied.branch ? (branches.find((b) => b.id === applied.branch)?.name ?? applied.branch) : 'All branches')} · {applied.from} – {applied.to} · Currency {data.currency}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setApplied(draft); setPage(1) }} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-(--color-brand) px-3 text-xs font-semibold text-white hover:bg-brand-hover">
            <Play size={12} /> Run report
          </button>
          <GhostButton onClick={exportCsv} disabled={!data?.caps.csv || !data.rows.length}><Download size={12} /> Export CSV</GhostButton>
          <GhostButton onClick={() => window.print()}><Printer size={12} /> Print</GhostButton>
          <GhostButton onClick={() => void refetch()}><RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Refresh</GhostButton>
          <div className="relative">
            <GhostButton onClick={() => setShowCols((v) => !v)}><Columns3 size={12} /> Columns</GhostButton>
            {showCols && data && (
              <div className="absolute z-20 mt-1 w-48 rounded-lg border border-border bg-surface p-2 shadow-lg">
                {data.columns.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 px-1 py-1 text-xs text-text">
                    <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => setHidden((h) => { const n = new Set(h); if (n.has(c.key)) n.delete(c.key); else n.add(c.key); return n })} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-5 border-b border-border text-sm">
          {def.tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => { setView(t.key); setSort({ key: '', dir: 'desc' }); setPage(1) }} className={`-mb-px border-b-2 pb-2 ${t.key === view ? 'border-brand font-semibold text-brand' : 'border-transparent text-text-muted hover:text-text!'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <Status loading={isLoading} error={error} />
        {data && (
          <>
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-surface-alt lg:grid-cols-5">
              {data.metrics.map((m) => (
                <div key={m.label} className="border-r border-border p-3 last:border-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">{m.label}</p>
                  <p className="font-serif text-xl font-semibold text-text! tabular-nums">{m.value}</p>
                </div>
              ))}
            </div>
            {data.note && <p className="text-xs text-text-faint">{data.note}</p>}
            <div className="flex flex-wrap gap-2 text-xs">
              {[(applied.branch ? (branches.find((b) => b.id === applied.branch)?.name ?? applied.branch) : 'All branches'), `${applied.from} – ${applied.to}`, applied.statuses.length === 3 ? 'All fiscal statuses' : applied.statuses.join(', ')].map((c) => (
                <span key={c} className="rounded-full bg-success-bg px-3 py-1 text-success-fg">{c}</span>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface-alt">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-faint">
                    {columns.map((c) => (
                      <th key={c.key} onClick={() => toggleSort(c)} className={`px-3 py-2.5 font-medium ${c.num ? 'text-right' : ''} ${c.sortable ? 'cursor-pointer select-none' : ''}`}>
                        {c.label} {c.sortable && (data.sort === c.key ? (data.dir === 'asc' ? '↑' : '↓') : '↕')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr><td colSpan={columns.length || 1} className="px-3 py-6 text-center text-text-faint">No transactions match these filters.</td></tr>
                  ) : (
                    data.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-hover">
                        {columns.map((c) => (
                          <td key={c.key} className={`px-3 py-2 ${c.num ? 'text-right tabular-nums' : ''}`}><Cell col={c} row={row} /></td>
                        ))}
                      </tr>
                    ))
                  )}
                  <tr className="border-t border-border font-semibold text-text!">
                    {columns.map((c, i) => (
                      <td key={c.key} className={`px-3 py-2.5 ${c.num ? 'text-right tabular-nums' : ''}`}>
                        {i === 0 ? 'Filtered totals' : c.key in data.totals ? Number(data.totals[c.key]).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-text-faint">
              <span>{data.total_rows} rows</span>
              <div className="flex items-center gap-2">
                Rows
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className="h-7 rounded border border-input-border bg-input-bg px-1 text-text">
                  {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
                </select>
                <button type="button" aria-label="Previous page" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} className="rounded border border-border p-1 disabled:opacity-40"><ChevronLeft size={12} /></button>
                {data.page}/{data.pages}
                <button type="button" aria-label="Next page" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)} className="rounded border border-border p-1 disabled:opacity-40"><ChevronRight size={12} /></button>
              </div>
            </div>
            <div className="flex justify-between text-xs text-text-faint">
              <span>Generated {data.generated_at} · totals cover every filtered row</span>
              <span>Currency {data.currency}</span>
            </div>
          </>
        )}
      </section>

      <div className="max-h-full min-w-0 self-start space-y-3 overflow-y-auto text-sm">
        <p className="text-base font-bold text-text!">Filters</p>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-faint">From<input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className={`${FIELD} mt-1 normal-case`} /></label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-faint">To<input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className={`${FIELD} mt-1 normal-case`} /></label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-faint">Branch
          <select value={draft.branch} onChange={(e) => setDraft({ ...draft, branch: e.target.value })} className={`${FIELD} mt-1 normal-case`}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-faint">Medicine<input value={draft.medicine} onChange={(e) => setDraft({ ...draft, medicine: e.target.value })} placeholder="Name or strength" className={`${FIELD} mt-1 normal-case`} /></label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-faint">Payment method
          <select value={draft.payment} onChange={(e) => setDraft({ ...draft, payment: e.target.value })} className={`${FIELD} mt-1 normal-case`}>
            <option value="">All payment methods</option>
            {(data?.payments ?? []).map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-faint">Fiscal status</legend>
          {PHARMACY_FISCAL_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-2 py-0.5 text-text">
              <input type="checkbox" checked={draft.statuses.includes(s)} onChange={() => setDraft({ ...draft, statuses: draft.statuses.includes(s) ? draft.statuses.filter((x) => x !== s) : [...draft.statuses, s] })} /> {s}
            </label>
          ))}
        </fieldset>
        <button type="button" onClick={() => { setApplied(draft); setPage(1) }} className="h-10 w-full rounded-lg bg-(--color-brand) text-sm font-semibold text-white hover:bg-brand-hover">Apply filters</button>
        <button type="button" onClick={() => { const f = initialFilters(); setDraft(f); setApplied(f); setPage(1) }} className="h-10 w-full rounded-lg border border-border text-sm font-medium text-text hover:bg-surface-hover">Reset filters</button>
        <p className="text-xs leading-relaxed text-text-faint">Totals derive from recorded invoice and credit-note values. Exports and previews apply the same filters and permissions as the displayed report.</p>
      </div>
    </div>
  )
}
