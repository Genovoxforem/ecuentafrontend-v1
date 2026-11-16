import { useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FileText } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { useEntities } from '../../settings/settings.queries'
import { fmt, isoDate, num } from '../reportFormat'
import {
  breakdown,
  ENTITYWISE_TABS,
  groupByCategory,
  useEntitywise,
  type Debtors,
  type DailySales,
  type EntitywiseFilters,
  type EntitywiseTab,
  type SaleMonth,
  type SalesSummary,
  type StockPosition,
  type SupplierStock,
} from '../entitywiseDaily.data'
import { inputCls, RangeBar, ReportError, ReportLoading, TabBar } from './ReportWidgets'

const th = 'px-2 py-2 text-xs font-semibold uppercase tracking-wide text-text-faint whitespace-nowrap'
const td = 'px-2 py-1.5 text-sm text-text-muted'
const catRow = 'bg-surface-hover px-2 py-1.5 text-xs font-bold uppercase text-text'

function Money({ v }: { v: string | number | undefined }) {
  return <>{fmt(v)}</>
}
function Table({ head, children, foot }: { head: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>{head}</thead>
        <tbody>{children}</tbody>
        {foot && <tfoot>{foot}</tfoot>}
      </table>
    </div>
  )
}
function Section({ title, exportRows, children }: { title: string; exportRows?: () => { headers: string[]; rows: string[][] }; children: ReactNode }) {
  return (
    <Card className="!h-auto space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-text!">{title}</h3>
        {exportRows && <TableExportButtons title={title} getExportData={exportRows} />}
      </div>
      {children}
    </Card>
  )
}
const empty = (cols: number, text: string) => (
  <tr>
    <td colSpan={cols} className="px-2 py-6 text-center text-sm italic text-text-faint">
      {text}
    </td>
  </tr>
)

function DayTable({ s, kind, title }: { s: SalesSummary; kind: 'sales' | 'expense' | 'deposit'; title: string }) {
  const b = breakdown(s, kind)
  if (!b.dates.length) return <Section title={title}><p className="text-sm italic text-text-faint">No data for selected range</p></Section>
  const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).replace(' ', '-')
  return (
    <Section
      title={title}
      exportRows={() => ({ headers: ['Outlet', ...b.dates.map(day), 'Total'], rows: [...b.rows.map((r) => [r.label, ...r.cells.map((c) => (c > 0 ? fmt(c) : '-')), fmt(r.total)]), ['Total', ...b.totals.map(fmt), fmt(b.grand)]] })}
    >
      <Table
        head={
          <tr className="border-b border-border">
            <th className={`${th} text-left`}>Outlet</th>
            {b.dates.map((d) => (
              <th key={d} className={`${th} text-right`}>
                {day(d)}
              </th>
            ))}
            <th className={`${th} text-right`}>Total</th>
          </tr>
        }
        foot={
          <tr className="border-t border-border font-bold text-text">
            <td className={td}>Total</td>
            {b.totals.map((t, i) => (
              <td key={i} className={`${td} text-right`}>
                {fmt(t)}
              </td>
            ))}
            <td className={`${td} text-right`}>{fmt(b.grand)}</td>
          </tr>
        }
      >
        {b.rows.map((r, i) => (
          <tr key={i} className={`border-b border-border ${r.isEntity ? 'bg-brand/5 font-semibold text-text' : ''}`}>
            <td className={`${td} ${r.isEntity ? '' : 'pl-6'}`}>{r.label}</td>
            {r.cells.map((c, j) => (
              <td key={j} className={`${td} text-right`}>
                {c > 0 ? fmt(c) : <span className="text-text-faint">-</span>}
              </td>
            ))}
            <td className={`${td} text-right`}>{fmt(r.total)}</td>
          </tr>
        ))}
      </Table>
    </Section>
  )
}

function SalesSummaryTab({ f }: { f: EntitywiseFilters }) {
  const q = useEntitywise<SalesSummary>('sales_summary', f)
  if (q.isLoading) return <ReportLoading label="Loading…" />
  if (q.isError) return <ReportError error={q.error} onRetry={() => q.refetch()} />
  const s = q.data!
  const sum = (k: 'sales' | 'expense' | 'deposit' | 'stock_value') => s.outlets.reduce((a, o) => a + num(o[k]), 0)
  const chart = s.outlets.map((o) => ({ name: o.label, Sales: num(o.sales), Expense: num(o.expense), Deposit: num(o.deposit) }))
  const banks = s.bank_deposits ?? []
  return (
    <div className="space-y-4">
      <Section
        title="Daily Report"
        exportRows={() => ({
          headers: ['Outlet (Entity)', 'Sales', 'Expense', 'Deposits received', 'Value Of Stock'],
          rows: [...s.outlets.flatMap((o) => [[o.label, fmt(o.sales), fmt(o.expense), fmt(o.deposit), fmt(o.stock_value)], ...(o.warehouses ?? []).map((w) => [w.warehouse_ref, fmt(w.sales), fmt(w.expense), fmt(w.deposit), fmt(w.stock_value)])]), ['Total', fmt(sum('sales')), fmt(sum('expense')), fmt(sum('deposit')), fmt(sum('stock_value'))]],
        })}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Table
              head={
                <tr className="border-b border-border">
                  <th className={`${th} text-left`}>Outlet (Entity)</th>
                  {['Sales', 'Expense', 'Deposits received', 'Value Of Stock'].map((h) => (
                    <th key={h} className={`${th} text-right`}>
                      {h}
                    </th>
                  ))}
                </tr>
              }
              foot={
                <tr className="border-t border-border font-bold text-text">
                  <td className={td}>Total</td>
                  {(['sales', 'expense', 'deposit', 'stock_value'] as const).map((k) => (
                    <td key={k} className={`${td} text-right`}>
                      {fmt(sum(k))}
                    </td>
                  ))}
                </tr>
              }
            >
              {s.outlets.length === 0 && empty(5, 'No data for the selected range')}
              {s.outlets.flatMap((o) => [
                <tr key={o.entity_id} className="border-b border-border bg-brand/5 font-semibold text-text">
                  <td className={td}>{o.label}</td>
                  <td className={`${td} text-right`}><Money v={o.sales} /></td>
                  <td className={`${td} text-right`}><Money v={o.expense} /></td>
                  <td className={`${td} text-right`}><Money v={o.deposit} /></td>
                  <td className={`${td} text-right`}><Money v={o.stock_value} /></td>
                </tr>,
                ...(o.warehouses ?? []).map((w) => (
                  <tr key={`${o.entity_id}-${w.warehouse_id}`} className="border-b border-border">
                    <td className={`${td} pl-6`}>{w.warehouse_ref}</td>
                    <td className={`${td} text-right`}><Money v={w.sales} /></td>
                    <td className={`${td} text-right`}><Money v={w.expense} /></td>
                    <td className={`${td} text-right`}><Money v={w.deposit} /></td>
                    <td className={`${td} text-right`}><Money v={w.stock_value} /></td>
                  </tr>
                )),
              ])}
            </Table>
          </div>
          <div className="space-y-4">
            <div className="h-56" role="img" aria-label="Sales, expense and deposit by outlet">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} width={70} />
                  <Tooltip formatter={(v) => fmt(v as number)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Sales" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Deposit" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table
              head={
                <tr className="border-b border-border">
                  <th className={`${th} text-left`}>Bank</th>
                  <th className={`${th} text-right`}>Daily Deposit</th>
                  <th className={`${th} text-right`}>Monthly Deposit</th>
                </tr>
              }
              foot={
                <tr className="border-t border-border font-bold text-text">
                  <td className={td}>TOTAL</td>
                  <td className={`${td} text-right`}>{fmt(banks.reduce((a, b) => a + num(b.daily_deposit), 0))}</td>
                  <td className={`${td} text-right`}>{fmt(banks.reduce((a, b) => a + num(b.monthly_deposit), 0))}</td>
                </tr>
              }
            >
              {banks.length === 0 && empty(3, 'No bank deposit data')}
              {banks.map((b, i) => (
                <tr key={i} className="border-b border-border">
                  <td className={td}>{b.bank_name || 'Unknown'}</td>
                  <td className={`${td} text-right`}><Money v={b.daily_deposit} /></td>
                  <td className={`${td} text-right`}><Money v={b.monthly_deposit} /></td>
                </tr>
              ))}
            </Table>
          </div>
        </div>
      </Section>
      <DayTable s={s} kind="sales" title="Daily Sales By Outlet" />
      <DayTable s={s} kind="expense" title="Daily Expense By Outlet" />
      <DayTable s={s} kind="deposit" title="Daily Deposit By Outlet" />
    </div>
  )
}

function StockPositionTab({ f }: { f: EntitywiseFilters }) {
  const q = useEntitywise<StockPosition>('stock_position', f)
  if (q.isLoading) return <ReportLoading label="Loading…" />
  if (q.isError) return <ReportError error={q.error} onRetry={() => q.refetch()} />
  const wh = q.data!.warehouses
  const groups = groupByCategory(q.data!.products)
  const qty = (p: StockPosition['products'][number], id: string) => num(p.stock[id])
  const dash = (n: number) => (n > 0 ? fmt(n) : '-')
  return (
    <Section
      title="Stock Position"
      exportRows={() => ({ headers: ['Code', 'Description', ...wh.map((w) => `${w.ref} (${w.entity})`), 'TOTAL S/Hand(Bags)'], rows: groups.flatMap((g) => g.items.map((p) => [p.ref, p.label, ...wh.map((w) => dash(qty(p, w.id))), dash(wh.reduce((a, w) => a + qty(p, w.id), 0))])) })}
    >
      <Table
        head={
          <tr className="border-b border-border">
            <th className={`${th} text-left`}>Code</th>
            <th className={`${th} text-left`}>Description</th>
            {wh.map((w) => (
              <th key={w.id} className={`${th} text-right`}>
                {w.ref}
                <br />
                <small className="font-normal normal-case">{w.entity}</small>
              </th>
            ))}
            <th className={`${th} text-right`}>
              TOTAL
              <br />
              S/Hand(Bags)
            </th>
          </tr>
        }
      >
        {groups.length === 0 && empty(3 + wh.length, 'No stock data found')}
        {groups.flatMap((g) => [
          <tr key={`c-${g.category}`}>
            <td colSpan={3 + wh.length} className={catRow}>
              {g.category}
            </td>
          </tr>,
          ...g.items.map((p) => (
            <tr key={p.ref} className="border-b border-border">
              <td className={td}>{p.ref}</td>
              <td className={td}>{p.label}</td>
              {wh.map((w) => (
                <td key={w.id} className={`${td} text-right`}>
                  {dash(qty(p, w.id))}
                </td>
              ))}
              <td className={`${td} text-right font-bold text-text`}>{dash(wh.reduce((a, w) => a + qty(p, w.id), 0))}</td>
            </tr>
          )),
        ])}
      </Table>
    </Section>
  )
}

function DailySalesTab({ f }: { f: EntitywiseFilters }) {
  const q = useEntitywise<DailySales>('daily_sales', f)
  if (q.isLoading) return <ReportLoading label="Loading…" />
  if (q.isError) return <ReportError error={q.error} onRetry={() => q.refetch()} />
  const d = q.data!
  const groups = groupByCategory(d.products)
  const day = new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB')
  return (
    <Section
      title={`Daily Sales - ${day}`}
      exportRows={() => ({
        headers: ['Code', 'Description', ...d.entities.flatMap((e) => [`${e.label} Qty`, `${e.label} Amount`]), 'Qty (Bags)', 'Sale Value', 'Value of Stock'],
        rows: groups.flatMap((g) => g.items.map((p) => [p.ref, p.label, ...d.entities.flatMap((e) => [p.sales[e.rowid]?.qty ?? '-', p.sales[e.rowid]?.amount ? fmt(p.sales[e.rowid].amount) : '-']), String(d.entities.reduce((a, e) => a + num(p.sales[e.rowid]?.qty), 0)), fmt(d.entities.reduce((a, e) => a + num(p.sales[e.rowid]?.amount), 0)), fmt(p.stock_value)])),
      })}
    >
      <Table
        head={
          <>
            <tr className="border-b border-border">
              <th className={`${th} text-left`}>Code</th>
              <th className={`${th} text-left`}>Description</th>
              {d.entities.map((e) => (
                <th key={e.rowid} colSpan={2} className={`${th} text-right`}>
                  {e.label}
                </th>
              ))}
              <th colSpan={3} className={`${th} text-right`}>
                TOTAL
              </th>
            </tr>
            <tr className="border-b border-border">
              <th />
              <th />
              {d.entities.flatMap((e) => [
                <th key={`${e.rowid}q`} className={`${th} text-right`}>Qty</th>,
                <th key={`${e.rowid}a`} className={`${th} text-right`}>Amount</th>,
              ])}
              <th className={`${th} text-right`}>Qty (Bags)</th>
              <th className={`${th} text-right`}>Sale Value</th>
              <th className={`${th} text-right`}>Value of Stock</th>
            </tr>
          </>
        }
      >
        {groups.length === 0 && empty(5 + d.entities.length * 2, 'No sales data for selected date')}
        {groups.flatMap((g) => [
          <tr key={`c-${g.category}`}>
            <td colSpan={5 + d.entities.length * 2} className={catRow}>
              {g.category}
            </td>
          </tr>,
          ...g.items.map((p) => {
            const tq = d.entities.reduce((a, e) => a + num(p.sales[e.rowid]?.qty), 0)
            const ta = d.entities.reduce((a, e) => a + num(p.sales[e.rowid]?.amount), 0)
            return (
              <tr key={p.ref} className="border-b border-border">
                <td className={td}>{p.ref}</td>
                <td className={td}>{p.label}</td>
                {d.entities.flatMap((e) => [
                  <td key={`${e.rowid}q`} className={`${td} text-right`}>{p.sales[e.rowid]?.qty || '-'}</td>,
                  <td key={`${e.rowid}a`} className={`${td} text-right`}>{p.sales[e.rowid]?.amount ? fmt(p.sales[e.rowid].amount) : '-'}</td>,
                ])}
                <td className={`${td} text-right font-bold text-text`}>{tq > 0 ? fmt(tq) : '-'}</td>
                <td className={`${td} text-right font-bold text-text`}>{ta > 0 ? fmt(ta) : '-'}</td>
                <td className={`${td} text-right font-bold text-text`}>{fmt(p.stock_value)}</td>
              </tr>
            )
          }),
        ])}
      </Table>
    </Section>
  )
}

function SaleMonthTab({ f }: { f: EntitywiseFilters }) {
  const q = useEntitywise<SaleMonth>('sale_month', f)
  if (q.isLoading) return <ReportLoading label="Loading…" />
  if (q.isError) return <ReportError error={q.error} onRetry={() => q.refetch()} />
  const d = q.data!
  const groups = groupByCategory(d.products)
  // The classic page prints the entity's opening and closing value of stock as the entity's share of the product's sales times the product's stock value.
  const share = (p: SaleMonth['products'][number], id: string) => {
    const a = num(p.by_entity[id]?.amount)
    return a ? (a / (num(p.total_amount) || 1)) * num(p.stock_value) : 0
  }
  return (
    <Section
      title={`Sales In ${d.month_label}`}
      exportRows={() => ({
        headers: ['Codes', 'Description', ...d.entities.flatMap((e) => [`${e.label} Value of Stock`, `${e.label} Qty`, `${e.label} Amount`, `${e.label} Value of Stock`]), 'Qty (Mts)', 'Sale Value', 'Value of Stock'],
        rows: groups.flatMap((g) => g.items.map((p) => [p.ref, p.label, ...d.entities.flatMap((e) => [fmt(share(p, e.rowid)), p.by_entity[e.rowid]?.qty ?? '-', p.by_entity[e.rowid]?.amount ? fmt(p.by_entity[e.rowid].amount) : '-', fmt(share(p, e.rowid))]), String(p.qty_mts ?? '-'), fmt(p.total_amount), fmt(p.stock_value)])),
      })}
    >
      <Table
        head={
          <>
            <tr className="border-b border-border">
              <th rowSpan={3} className={`${th} text-left`}>Codes</th>
              <th rowSpan={3} className={`${th} text-left`}>Description</th>
              {d.entities.map((e) => (
                <th key={e.rowid} colSpan={4} className={`${th} text-right`}>
                  {e.label}
                </th>
              ))}
              <th colSpan={3} rowSpan={2} className={`${th} text-right`}>TOTAL</th>
            </tr>
            <tr className="border-b border-border">
              {d.entities.flatMap((e) => [
                <th key={`${e.rowid}o`} rowSpan={2} className={`${th} text-right`}>Value of Stock</th>,
                <th key={`${e.rowid}s`} colSpan={2} className={`${th} text-right`}>SALES</th>,
                <th key={`${e.rowid}c`} rowSpan={2} className={`${th} text-right`}>Value of Stock</th>,
              ])}
            </tr>
            <tr className="border-b border-border">
              {d.entities.flatMap((e) => [
                <th key={`${e.rowid}q`} className={`${th} text-right`}>Qty</th>,
                <th key={`${e.rowid}a`} className={`${th} text-right`}>Amount</th>,
              ])}
              <th className={`${th} text-right`}>Qty (Mts)</th>
              <th className={`${th} text-right`}>Sale Value</th>
              <th className={`${th} text-right`}>Value of Stock</th>
            </tr>
          </>
        }
      >
        {groups.length === 0 && empty(5 + d.entities.length * 4, 'No data for selected month')}
        {groups.flatMap((g) => [
          <tr key={`c-${g.category}`}>
            <td colSpan={5 + d.entities.length * 4} className={catRow}>
              {g.category}
            </td>
          </tr>,
          ...g.items.map((p) => (
            <tr key={p.ref} className="border-b border-border">
              <td className={td}>{p.ref}</td>
              <td className={td}>{p.label}</td>
              {d.entities.flatMap((e) => {
                const v = share(p, e.rowid)
                const cell = (k: string, c: ReactNode) => <td key={`${e.rowid}${k}`} className={`${td} text-right`}>{c}</td>
                return [cell('o', v > 0 ? fmt(v) : '-'), cell('q', p.by_entity[e.rowid]?.qty || '-'), cell('a', p.by_entity[e.rowid]?.amount ? fmt(p.by_entity[e.rowid].amount) : '-'), cell('c', v > 0 ? fmt(v) : '-')]
              })}
              <td className={`${td} text-right font-bold text-text`}>{p.qty_mts !== '' && p.qty_mts !== undefined ? p.qty_mts : '-'}</td>
              <td className={`${td} text-right font-bold text-text`}>{fmt(p.total_amount)}</td>
              <td className={`${td} text-right font-bold text-text`}>{fmt(p.stock_value)}</td>
            </tr>
          )),
        ])}
      </Table>
    </Section>
  )
}

function SupplierStockTab({ f }: { f: EntitywiseFilters }) {
  const q = useEntitywise<SupplierStock>('supplier_stock_value', f)
  if (q.isLoading) return <ReportLoading label="Loading…" />
  if (q.isError) return <ReportError error={q.error} onRetry={() => q.refetch()} />
  const data = q.data!.data ?? []
  const grand = data.reduce((a, s) => a + num(s.total), 0)
  return (
    <Section
      title="Supplierwise Stock Value"
      exportRows={() => ({ headers: ['Supplier', 'Category', 'Code', 'Description', 'Qty', 'Unit Price', 'Value'], rows: data.flatMap((s) => s.categories.flatMap((c) => c.products.map((p) => [s.supplier, c.category, p.ref, p.label, p.qty, fmt(p.unit_price), fmt(p.value)]))) })}
    >
      <Table
        head={
          <tr className="border-b border-border">
            <th className={`${th} text-left`} colSpan={2} />
            <th className={`${th} text-left`}>Code</th>
            <th className={`${th} text-left`}>Description</th>
            <th className={`${th} text-right`}>Qty</th>
            <th className={`${th} text-right`}>Unit Price</th>
            <th className={`${th} text-right`}>Value</th>
          </tr>
        }
        foot={
          data.length > 0 && (
            <tr className="border-t border-border font-bold text-text">
              <td className={td} colSpan={6}>GRAND TOTAL</td>
              <td className={`${td} text-right`}>{fmt(grand)}</td>
            </tr>
          )
        }
      >
        {data.length === 0 && empty(7, 'No stock data found.')}
        {data.flatMap((s) => [
          <tr key={`s-${s.supplier}`}>
            <td colSpan={7} className={catRow}>{s.supplier}</td>
          </tr>,
          ...s.categories.flatMap((c) => [
            <tr key={`${s.supplier}-${c.category}`} className="bg-surface">
              <td />
              <td colSpan={6} className={`${td} font-semibold text-text`}>{c.category}</td>
            </tr>,
            ...c.products.map((p) => (
              <tr key={`${s.supplier}-${c.category}-${p.ref}`} className="border-b border-border">
                <td colSpan={2} />
                <td className={td}>{p.ref}</td>
                <td className={td}>{p.label}</td>
                <td className={`${td} text-right`}>{p.qty}</td>
                <td className={`${td} text-right`}><Money v={p.unit_price} /></td>
                <td className={`${td} text-right`}><Money v={p.value} /></td>
              </tr>
            )),
            <tr key={`${s.supplier}-${c.category}-t`} className="bg-surface">
              <td className={`${td} text-right font-semibold`} colSpan={6}>Category Total</td>
              <td className={`${td} text-right font-semibold text-text`}>{fmt(c.total)}</td>
            </tr>,
          ]),
          <tr key={`${s.supplier}-t`} className="border-b border-border bg-surface-hover">
            <td className={`${td} text-right font-bold text-text`} colSpan={6}>Supplier Total</td>
            <td className={`${td} text-right font-bold text-text`}>{fmt(s.total)}</td>
          </tr>,
        ])}
      </Table>
    </Section>
  )
}

function DebtorsTab({ f }: { f: EntitywiseFilters }) {
  const q = useEntitywise<Debtors>('customer_debtors', f)
  if (q.isLoading) return <ReportLoading label="Loading…" />
  if (q.isError) return <ReportError error={q.error} onRetry={() => q.refetch()} />
  const d = q.data!
  const badge = (age: string) => {
    const n = parseInt(age, 10) || 0
    return n > 90 ? 'bg-danger-bg text-danger-fg' : n > 30 ? 'bg-warning-bg text-warning-fg' : 'bg-success-bg text-success-fg'
  }
  return (
    <Section
      title="Customer-Debtors"
      exportRows={() => ({ headers: ['Customer Name', 'Product', 'Total Sales', 'Amount Received', 'Balance', 'Last Payment', 'Credit Age'], rows: d.debtors.map((r) => [r.customer, r.product, fmt(r.total_sales), fmt(r.received), fmt(r.balance), r.last_payment, r.credit_age]) })}
    >
      <Table
        head={
          <tr className="border-b border-border">
            <th className={`${th} text-left`}>Customer Name</th>
            <th className={`${th} text-left`}>Product</th>
            <th className={`${th} text-right`}>Total Sales</th>
            <th className={`${th} text-right`}>Amount Received</th>
            <th className={`${th} text-right`}>Balance</th>
            <th className={`${th} text-left`}>Last Payment</th>
            <th className={`${th} text-right`}>Credit Age</th>
          </tr>
        }
        foot={
          <tr className="border-t border-border font-bold text-text">
            <td className={td} colSpan={4}>Total Outstanding</td>
            <td className={`${td} text-right text-danger-fg`}>{fmt(d.total_balance)}</td>
            <td colSpan={2} />
          </tr>
        }
      >
        {d.debtors.length === 0 && empty(7, 'No outstanding debtors found')}
        {d.debtors.map((r, i) => (
          <tr key={i} className="border-b border-border">
            <td className={`${td} font-semibold text-text`}>{r.customer}</td>
            <td className={td}>{r.product}</td>
            <td className={`${td} text-right`}><Money v={r.total_sales} /></td>
            <td className={`${td} text-right`}><Money v={r.received} /></td>
            <td className={`${td} text-right font-bold text-danger-fg`}><Money v={r.balance} /></td>
            <td className={td}>{r.last_payment}</td>
            <td className={`${td} text-right`}>
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badge(r.credit_age)}`}>{r.credit_age}</span>
            </td>
          </tr>
        ))}
      </Table>
    </Section>
  )
}

const TAB_VIEW: Record<EntitywiseTab, (p: { f: EntitywiseFilters }) => ReactNode> = {
  sales_summary: (p) => <SalesSummaryTab {...p} />,
  stock_position: (p) => <StockPositionTab {...p} />,
  daily_sales: (p) => <DailySalesTab {...p} />,
  sale_month: (p) => <SaleMonthTab {...p} />,
  supplier_stock_value: (p) => <SupplierStockTab {...p} />,
  customer_debtors: (p) => <DebtorsTab {...p} />,
}

// "Entitywise Daily Report" of the Reports Center (classic custom/reports/entitywise_daily_report.php): Date Range and Entity with Apply, and the six tabs
// Sales Summary, Stock Position, Daily Sales, Sale In A Month, Supplierwise Stock Value and Customer-Debtors. It opens on today for all entities, like the
// classic page. Data: entitywiseDaily.data.ts.
export function EntitywiseDailyView() {
  const today = isoDate(new Date())
  const [range, setRange] = useState({ start: today, end: today })
  const [entity, setEntity] = useState('0')
  const [tab, setTab] = useState<EntitywiseTab>('sales_summary')
  const entities = useEntities()
  const f: EntitywiseFilters = { from: range.start, to: range.end, entity }
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileText size={20} className="text-brand" /> Entitywise Daily Report
      </h2>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Date Range" buttonLabel="Apply" onApply={(start, end) => setRange({ start, end })}>
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">Entity</span>
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className={`${inputCls} min-w-44`} aria-label="Entity">
            <option value="0">All Entities</option>
            {(entities.data ?? []).map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      </RangeBar>
      <TabBar tabs={ENTITYWISE_TABS} value={tab} onChange={setTab} />
      {TAB_VIEW[tab]({ f })}
    </div>
  )
}
