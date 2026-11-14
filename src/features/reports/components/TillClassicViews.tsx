import { Fragment, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Info, Receipt, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { fmt } from '../reportFormat'
import {
  loadTillDetail,
  tillParams,
  useTillPage,
  type OrderDetail,
  type SessionDetail,
  type TillField,
  type TillKind,
  type TillPage,
  type TillRow,
  type TillTable,
} from '../tillClassic.data'
import { Badge, inputCls, KpiCard, MultiSelectDropdown, primaryBtn, ReportError, ReportLoading, secondaryBtn, type ReportTone } from './ReportWidgets'

// "Till Sales Report" and "Till Sessions Report" of the Reports Center, read from the classic takeposnew pages (see tillClassic.data.ts):
// the filters, the figure cards and the tables are what the page prints, and a "+" on an order or a session opens the page's own detail call.

const TONES: ReportTone[] = ['blue', 'green', 'amber', 'teal', 'rose']

function DetailTable({ headers, rows, empty, right = [] }: { headers: string[]; rows: string[][]; empty: string; right?: number[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-text-faint">
          {headers.map((h, i) => (
            <th key={h} className={`px-2 py-1.5 font-medium ${right.includes(i) ? 'text-right' : 'text-left'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="px-2 py-2 italic text-text-faint">
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((r, ri) => (
            <tr key={ri} className="border-b border-border last:border-0">
              {r.map((c, ci) => (
                <td key={ci} className={`px-2 py-1.5 text-text-muted ${right.includes(ci) ? 'text-right' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function OrderDetailPanel({ id, query, row }: { id: string; query: string; row: TillRow }) {
  const q = useQuery({ queryKey: ['reports', 'tillDetail', 'sales', id, query], queryFn: () => loadTillDetail<OrderDetail>('sales', id, query), staleTime: 30_000 })
  if (q.isLoading) return <ReportLoading label="Loading order details…" />
  if (q.isError) return <ReportError error={q.error} onRetry={() => q.refetch()} />
  const d = q.data
  if (!d) return null
  const kots = new Map<string, number>()
  for (const l of d.lines) if (l.kot) kots.set(l.kot, (kots.get(l.kot) ?? 0) + 1)
  const e = row.events
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div>
        <h6 className="mb-2 text-xs font-semibold uppercase text-text-faint">Order Items</h6>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-text-faint">
              <th className="px-2 py-1.5 text-left font-medium">Item</th>
              <th className="px-2 py-1.5 text-center font-medium">Qty</th>
              <th className="px-2 py-1.5 text-right font-medium">Price</th>
              <th className="px-2 py-1.5 text-right font-medium">Total</th>
              <th className="px-2 py-1.5 text-left font-medium">KOT</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l, i) => (
              <Fragment key={i}>
                <tr className="border-b border-border">
                  <td className="px-2 py-1.5 text-text">
                    <strong>{l.label}</strong>
                    {l.is_supp && <> <Badge tone="info">Supplement</Badge></>}
                    {l.is_comp && <> <Badge tone="neutral">Composition</Badge></>}
                    {l.mods.length > 0 && <> <Badge tone="warning">{l.mods.length} mod</Badge></>}
                    {l.cats.length > 0 && <div className="text-[11px] text-text-faint">{l.cats.join(', ')}</div>}
                  </td>
                  <td className="px-2 py-1.5 text-center">{l.qty}</td>
                  <td className="px-2 py-1.5 text-right">{fmt(l.price)}</td>
                  <td className="px-2 py-1.5 text-right font-semibold">{fmt(l.ttc)}</td>
                  <td className="px-2 py-1.5">{l.kot || '-'}</td>
                </tr>
                {l.mods.map((m, mi) => (
                  <tr key={`m${mi}`} className="border-b border-border text-text-faint">
                    <td className="px-2 py-1">↳ + {m.qty}x {m.label}</td>
                    <td />
                    <td />
                    <td className="px-2 py-1 text-right">{fmt(m.ttc)}</td>
                    <td className="px-2 py-1">Mod</td>
                  </tr>
                ))}
                {l.comps.map((c, ci) => (
                  <tr key={`c${ci}`} className="border-b border-border text-text-faint">
                    <td className="px-2 py-1">↳ contains {c.qty}x {c.label}{c.yw ? ` · yield ${c.yw}` : ''}</td>
                    <td />
                    <td />
                    <td />
                    <td className="px-2 py-1">Comp</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h6 className="mb-2 text-xs font-semibold uppercase text-text-faint">Payments</h6>
        <DetailTable
          headers={['Date', 'Type', 'Amount', 'By']}
          rows={d.payments.map((p) => [p.date, p.label + (p.num ? ` #${p.num}` : ''), fmt(p.amount) + (p.change ? ` (change: ${fmt(p.change)})` : ''), p.user])}
          empty="No payments recorded"
          right={[2]}
        />
      </div>
      <div>
        <h6 className="mb-2 text-xs font-semibold uppercase text-text-faint">Order Events</h6>
        <ul className="space-y-1 text-xs text-text-muted">
          <li>
            <strong className="text-text">Order created</strong> · {e?.created}
          </li>
          {e?.validated && (
            <li>
              <strong className="text-text">Validated</strong> · {e.validated}
            </li>
          )}
          {Array.from(kots, ([k, n]) => (
            <li key={k}>
              <strong className="text-text">KOT: {k}</strong> · {n} item(s)
            </li>
          ))}
          {d.payments.map((p, i) => (
            <li key={i}>
              <strong className="text-text">
                Payment {p.label} — {fmt(p.amount)}
              </strong>{' '}
              · {p.date}
            </li>
          ))}
          <li>
            <strong className="text-text">Last update</strong> · {e?.updated}
          </li>
        </ul>
      </div>
    </div>
  )
}

function SessionDetailPanel({ id, query }: { id: string; query: string }) {
  const q = useQuery({ queryKey: ['reports', 'tillDetail', 'sessions', id, query], queryFn: () => loadTillDetail<SessionDetail>('sessions', id, query), staleTime: 30_000 })
  if (q.isLoading) return <ReportLoading label="Loading session payments…" />
  if (q.isError) return <ReportError error={q.error} onRetry={() => q.refetch()} />
  return (
    <DetailTable
      headers={['Date', 'Invoice', 'Type', 'Ref/Num', 'Amount', 'Change', 'Recorded By']}
      rows={(q.data?.payments ?? []).map((p) => [p.date, p.invoice, p.label, p.num || '-', fmt(p.amount), p.change ? fmt(p.change) : '-', p.user])}
      empty="No payments recorded in this session window."
      right={[4, 5]}
    />
  )
}

function statusTone(text: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  if (/^(paid|closed)$/i.test(text)) return 'success'
  if (/^(open|pickup)$/i.test(text)) return 'info'
  if (/^(unpaid|draft)/i.test(text)) return 'warning'
  return 'neutral'
}

function ResultTable({ kind, table, query }: { kind: TillKind; table: TillTable; query: string }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const expandable = table.rows.some((r) => r.detailId)
  const statusCol = table.headers.indexOf('Status')
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (!n.delete(id)) n.add(id)
      return n
    })
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        {table.heading && <h4 className="font-semibold text-text!">{table.heading}</h4>}
        <TableExportButtons title={table.heading || (kind === 'sales' ? 'Till Sales Report' : 'Till Sessions Report')} getExportData={() => ({ headers: table.headers, rows: table.rows.map((r) => r.cells) })} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
              {expandable && <th className="w-8" />}
              {table.headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 && (
              <tr>
                <td colSpan={table.headers.length + 1} className="px-3 py-6 text-center italic text-text-faint">
                  {table.emptyNote || 'No data'}
                </td>
              </tr>
            )}
            {table.rows.map((r, ri) => {
              const id = r.detailId
              const shown = id !== null && open.has(id)
              return (
                <Fragment key={ri}>
                  <tr className="border-b border-border">
                    {expandable && (
                      <td className="px-2">
                        {id !== null && (
                          <button type="button" onClick={() => toggle(id)} aria-label={shown ? 'Hide details' : 'Show details'} aria-expanded={shown} className="text-text-muted hover:text-text">
                            {shown ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        )}
                      </td>
                    )}
                    {r.cells.map((c, ci) => (
                      <td key={ci} className="whitespace-nowrap px-3 py-2 text-text-muted">
                        {ci === statusCol && c ? <Badge tone={statusTone(c)}>{c}</Badge> : c}
                      </td>
                    ))}
                  </tr>
                  {shown && id !== null && (
                    <tr className="border-b border-border bg-surface">
                      <td colSpan={table.headers.length + 1} className="px-4 py-3">
                        {kind === 'sales' ? <OrderDetailPanel id={id} query={query} row={r} /> : <SessionDetailPanel id={id} query={query} />}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function FilterField({ field, value, onChange }: { field: TillField; value: string[]; onChange: (v: string[]) => void }) {
  if (!field.options) {
    return <input value={value[0] ?? ''} onChange={(e) => onChange([e.target.value])} className={`${inputCls} min-w-44`} aria-label={field.label} />
  }
  if (field.multiple) return <MultiSelectDropdown label={field.label} options={field.options} value={value} onChange={onChange} />
  return (
    <select value={value[0] ?? ''} onChange={(e) => onChange([e.target.value])} className={`${inputCls} min-w-44`} aria-label={field.label}>
      {field.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

const valuesOf = (page: TillPage) => Object.fromEntries(page.fields.map((f) => [f.name, f.value])) as Record<string, string[]>

function TillClassicView({ kind, title }: { kind: TillKind; title: string }) {
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<{ range: { start: string; end: string }; values: Record<string, string[]> } | null>(null)
  const q = useTillPage(kind, query)
  const page = q.data
  const form = draft ?? (page ? { range: page.range, values: valuesOf(page) } : null)
  const bad = !!form && (!form.range.start || !form.range.end || form.range.start > form.range.end)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Receipt size={20} className="text-brand" /> {title}
      </h2>
      {page?.note && (
        <p className="flex items-start gap-2 rounded-md border border-warning-fg/30 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
          <Info size={16} className="mt-0.5 shrink-0" /> {page.note}
        </p>
      )}
      {q.isLoading && <ReportLoading label={`Loading the ${title.toLowerCase()}…`} />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {page && form && (
        <>
          <Card className="!h-auto">
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (!bad) setQuery(tillParams(form.values, form.range).toString())
              }}
            >
              {page.fields.map((f, i) => (
                <Fragment key={f.name}>
                  {i === (kind === 'sales' ? 1 : 0) && (
                    <label className="text-sm font-medium text-text">
                      <span className="mb-1 block">Date range</span>
                      <span className="flex items-center gap-2">
                        <input type="date" value={form.range.start} onChange={(e) => setDraft({ ...form, range: { ...form.range, start: e.target.value } })} className={inputCls} aria-label="From" />
                        <span className="text-text-muted">to</span>
                        <input type="date" value={form.range.end} onChange={(e) => setDraft({ ...form, range: { ...form.range, end: e.target.value } })} className={inputCls} aria-label="To" />
                      </span>
                    </label>
                  )}
                  <label className="text-sm font-medium text-text">
                    <span className="mb-1 block">{f.label}</span>
                    <FilterField field={f} value={form.values[f.name] ?? []} onChange={(v) => setDraft({ ...form, values: { ...form.values, [f.name]: v } })} />
                  </label>
                </Fragment>
              ))}
              <button type="submit" disabled={bad || q.isFetching} className={primaryBtn}>
                <Search size={14} /> Apply
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setDraft(null)
                }}
                className={secondaryBtn}
              >
                Reset
              </button>
            </form>
            {bad && <p className="mt-2 text-xs text-danger-fg">Choose a start date that is not after the end date.</p>}
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {page.cards.map((c, i) => (
              <KpiCard key={c.label} label={c.label} value={c.value} sub={c.lines.length > 0 ? <span className="whitespace-pre-line">{c.lines.join('\n')}</span> : undefined} tone={TONES[i % TONES.length]} />
            ))}
          </div>

          {page.tables.map((t, i) => (
            <ResultTable key={`${t.heading}${i}`} kind={kind} table={t} query={query} />
          ))}
        </>
      )}
    </div>
  )
}

export const TillSalesReportView = () => <TillClassicView kind="sales" title="Till Sales Report" />
export const TillSessionsReportView = () => <TillClassicView kind="sessions" title="Till Sessions Report" />
