import { useQuery } from '@tanstack/react-query'
import { parseLegacyJson } from '../../shared/legacyHtmlFetch'
import { num } from './reportFormat'

// "Entitywise Daily Report" (classic custom/reports/entitywise_daily_report.php). The page calls one JSON file with GET, once per tab
// (read on newecuenta on 10 Nov 2026; it answers the signed-in session only, not the API key):
//   /custom/reports/entitywise_daily_report_ajax.php?action=<tab>&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&date=YYYY-MM-DD&entity_id=<0 = all>
//   sales_summary        -> { outlets [{ entity_id, label, sales, expense, deposit, stock_value, warehouses [{ warehouse_id, warehouse_ref, sales, expense, deposit, stock_value }] }],
//                           bank_deposits [{ bank_name, daily_deposit, monthly_deposit }], all_dates [YYYY-MM-DD], daily_sales / daily_expense [{ day, entity, warehouse_id, total }],
//                           daily_deposit [{ day, entity, total }] }
//   stock_position       -> { warehouses [{ id, ref, entity }], products [{ ref, label, category, stock { <warehouse id>: qty } }] }
//   daily_sales          -> { date, entities [{ rowid, label }], products [{ ref, label, category, sales { <entity id>: { qty, amount } }, stock_value }] }
//   sale_month           -> { month_label, entities, products [{ ref, label, category, total_qty, total_amount, stock_value, qty_mts, by_entity { <entity id>: { qty, amount } } }] }
//   supplier_stock_value -> { data [{ supplier, total, categories [{ category, total, products [{ ref, label, qty, unit_price, value }] }] }] }
//   customer_debtors     -> { debtors [{ customer, product, total_sales, received, balance, last_payment, credit_age }], total_balance }
// "date" is the day of the Daily Sales tab: the chosen day when the period is a single day, otherwise today. The classic page has no permission check of its
// own on this file (master report AN-188); the page only reads it.

export type EntitywiseTab = 'sales_summary' | 'stock_position' | 'daily_sales' | 'sale_month' | 'supplier_stock_value' | 'customer_debtors'

export const ENTITYWISE_TABS: Array<{ key: EntitywiseTab; label: string }> = [
  { key: 'sales_summary', label: 'Sales Summary' },
  { key: 'stock_position', label: 'Stock Position' },
  { key: 'daily_sales', label: 'Daily Sales' },
  { key: 'sale_month', label: 'Sale In A Month' },
  { key: 'supplier_stock_value', label: 'Supplierwise Stock Value' },
  { key: 'customer_debtors', label: 'Customer-Debtors' },
]

export interface WarehouseFigures {
  warehouse_id: string
  warehouse_ref: string
  sales: string
  expense: string
  deposit: string
  stock_value: string
}
export interface Outlet {
  entity_id: number
  label: string
  sales: string
  expense: string
  deposit: string
  stock_value: string
  warehouses?: WarehouseFigures[]
}
export interface DayTotal {
  day: string
  entity: string
  warehouse_id?: string
  total: string
}
export interface SalesSummary {
  outlets: Outlet[]
  bank_deposits: Array<{ bank_name: string | null; daily_deposit: string; monthly_deposit: string }>
  all_dates: string[]
  daily_sales: DayTotal[]
  daily_expense: DayTotal[]
  daily_deposit: DayTotal[]
}
export interface StockPosition {
  warehouses: Array<{ id: string; ref: string; entity: string }>
  products: Array<{ ref: string; label: string; category: string | null; stock: Record<string, string> }>
}
export interface EntityRef {
  rowid: string
  label: string
}
export interface DailySales {
  date: string
  entities: EntityRef[]
  products: Array<{ ref: string; label: string; category: string | null; sales: Record<string, { qty?: string; amount?: string }>; stock_value: string }>
}
export interface SaleMonth {
  month_label: string
  entities: EntityRef[]
  products: Array<{ ref: string; label: string; category: string | null; total_qty: string; total_amount: string; stock_value: string; qty_mts: number | string; by_entity: Record<string, { qty?: string; amount?: string }> }>
}
export interface SupplierStock {
  data: Array<{ supplier: string; total: string; categories: Array<{ category: string; total: string; products: Array<{ ref: string; label: string; qty: string; unit_price: string; value: string }> }> }>
}
export interface Debtors {
  debtors: Array<{ customer: string; product: string; total_sales: string; received: string; balance: string; last_payment: string; credit_age: string }>
  total_balance: string
}

export interface EntitywiseFilters {
  from: string
  to: string
  entity: string
}

type Answer<T> = T & { success: boolean; error?: string }

async function read<T>(action: EntitywiseTab, f: EntitywiseFilters): Promise<T> {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const params = new URLSearchParams({ action, start_date: f.from, end_date: f.to, date: f.from === f.to ? f.from : todayIso, entity_id: f.entity })
  const res = await fetch(`/custom/reports/entitywise_daily_report_ajax.php?${params.toString()}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const json = await parseLegacyJson<Answer<T>>(res)
  if (!json.success) throw new Error(json.error || 'The report could not be read.')
  return json
}

export function useEntitywise<T>(tab: EntitywiseTab, f: EntitywiseFilters) {
  return useQuery({ queryKey: ['reports', 'entitywise', tab, f], queryFn: () => read<T>(tab, f), staleTime: 60_000 })
}

// Rows of "Sales / Expense / Deposit by day": one line per outlet (its warehouses under it), one column per day of the period, and a total.
export interface BreakdownRow {
  label: string
  isEntity: boolean
  cells: number[]
  total: number
}
export function breakdown(s: SalesSummary, kind: 'sales' | 'expense' | 'deposit'): { dates: string[]; rows: BreakdownRow[]; totals: number[]; grand: number } {
  const dates = s.all_dates ?? []
  const source = kind === 'sales' ? s.daily_sales : kind === 'expense' ? s.daily_expense : s.daily_deposit
  const day = (d: string) => (d ? d.substring(0, 10) : d)
  const rows: BreakdownRow[] = []
  const totals = dates.map(() => 0)
  s.outlets.forEach((o) => {
    const mine = source.filter((r) => String(r.entity) === String(o.entity_id))
    const cells = dates.map((dt) => mine.filter((r) => day(r.day) === dt).reduce((a, r) => a + num(r.total), 0))
    cells.forEach((v, i) => (totals[i] += v))
    rows.push({ label: o.label, isEntity: true, cells, total: cells.reduce((a, v) => a + v, 0) })
    ;(o.warehouses ?? []).forEach((w) => {
      const wc = dates.map((dt) => {
        if (kind !== 'deposit') return mine.filter((r) => day(r.day) === dt && String(r.warehouse_id) === String(w.warehouse_id)).reduce((a, r) => a + num(r.total), 0)
        // a deposit is kept per outlet: the classic page shares it between the warehouses in proportion to their sales of that day
        const dep = mine.filter((r) => day(r.day) === dt).reduce((a, r) => a + num(r.total), 0)
        const sales = s.daily_sales.filter((r) => day(r.day) === dt)
        const ws = sales.filter((r) => String(r.warehouse_id) === String(w.warehouse_id)).reduce((a, r) => a + num(r.total), 0)
        const es = sales.filter((r) => String(r.entity) === String(o.entity_id)).reduce((a, r) => a + num(r.total), 0)
        return es > 0 ? (dep * ws) / es : 0
      })
      rows.push({ label: w.warehouse_ref, isEntity: false, cells: wc, total: wc.reduce((a, v) => a + v, 0) })
    })
  })
  return { dates, rows, totals, grand: totals.reduce((a, v) => a + v, 0) }
}

export function groupByCategory<T extends { category: string | null }>(items: T[]): Array<{ category: string; items: T[] }> {
  const map = new Map<string, T[]>()
  items.forEach((p) => {
    const c = p.category || 'Uncategorized'
    map.set(c, [...(map.get(c) ?? []), p])
  })
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([category, list]) => ({ category, items: list }))
}
