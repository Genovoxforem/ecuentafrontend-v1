import { useQuery } from '@tanstack/react-query'
import { parseLegacyJson } from '../../shared/legacyHtmlFetch'
import { fmt, fmtInt, num, pct, type Numeric } from './reportFormat'

// custom/reports/monthly_statement_ajax.php: the pure-JSON companion of the classic Monthly Statement Report page
// (custom/reports/monthly_statement_report.php), read live on newecuenta on 10 Nov 2026. It runs on the classic SESSION cookie only: with the
// X-API-Key header alone it answers 200 with the classic login page (BUG-95), so a missing session surfaces as NOT_SIGNED_IN_MESSAGE.
//   ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD                 the whole statement (one object, the blocks below)
//   ?action=get_invoices&type=sales|purchase&status=paid|unpaid|previous_unpaid|upcoming&start_date&end_date&page&limit   the invoices behind a count
// Numbers come back as numbers, SUMs over no rows as null; list rows (get_invoices) come back with string amounts.
// The figures are read and shown as the classic page shows them (same formulas in statementKpis / the P&L rows below), nothing is recomputed.

const URL = '/custom/reports/monthly_statement_ajax.php'

type Count = number | null

export interface InvoiceBlock {
  total_count: Count
  validated_count: Count
  paid_count: Count
  unpaid_count: Count
  total_ht: Numeric
  total_vat: Numeric
  total_ttc: Numeric
  paid_ttc: Numeric
  unpaid_ttc: Numeric
  previous_unpaid_count: number
  partial_paid_count: number
  upcoming_payment_count: number
}

export interface StatementSales extends InvoiceBlock {
  sales_only: Partial<InvoiceBlock>
  credit_notes_only: Partial<InvoiceBlock>
  top_customers: Array<{ customer: string | null; inv_count: number; total: Numeric }>
  daily_trend: Array<{ day_num: number | string; daily_total: Numeric }>
}

export interface StatementPurchases extends InvoiceBlock {
  top_suppliers: Array<{ supplier: string | null; inv_count: number; total: Numeric }>
}

export interface StatementOrders {
  total_count: Count
  confirmed_count: Count
  cancelled_count?: Count
  total_ttc: Numeric
}

export interface StatementProposals {
  total_count: Count
  validated_count: Count
  signed_count: Count
  total_ttc: Numeric
}

export interface StatementExpenses {
  total_count: Count
  approved_count: Count
  draft_count: Count
  total_ttc: Numeric
  paid_amount: Numeric
  employee_expense_total: Numeric
  customer_expense_total: Numeric
  employee_expense_paid: Numeric
  customer_expense_paid: Numeric
  by_user: Array<{ employee: string | null; report_count: number; total: Numeric }>
  by_employee: Array<{ employee: string | null; report_count: number; total: Numeric }>
  by_customer: Array<{ customer: string | null; report_count: number; total: Numeric }>
  by_type: Array<{ fee_code?: string | null; fee_type?: string | null; total: Numeric }>
}

export interface StatementExpenseDetail {
  rowid: number
  ref: string
  date_debut: string | null
  date_fin: string | null
  total_ttc: Numeric
  status_label: string
  socid: number | null
  invoiceid: number | null
  purchaseid: number | null
  employeeid: number | null
  sales_invoice: number | null
  trip_id: number | null
  employee_name: string | null
  customer_name: string | null
  invoice_ref: string | null
  purchase_ref: string | null
  linked_employee_name: string | null
}

export interface StatementPayroll {
  employee_count: Count
  gross_total: Numeric
  allowance_total: Numeric
  deduction_total: Numeric
  nhima_total: Numeric
  napsa_total: Numeric
  paye_total: Numeric
  advance_deducted_total: Numeric
  paid_amount: Numeric
  salary_paid_total: Numeric
  by_method: Array<{ payment_method: string | null; emp_count: number; total: Numeric }>
}

export interface StatementBankAccount {
  ref: string
  label: string
  currency_code: string
  credits: Numeric
  debits: Numeric
  closing_balance: Numeric
  opening_balance: Numeric
}

export interface StatementBank {
  total_credits: Numeric
  total_debits: Numeric
  total_closing_balance: Numeric
  by_currency: Array<{ currency_code: string | null; accounts: StatementBankAccount[]; total_credits: Numeric; total_debits: Numeric; total_closing_balance: Numeric }>
}

export interface StatementWarehouse {
  warehouses: Array<{ warehouse_ref: string; warehouse_name: string | null; product_count: number; total_qty: Numeric; stock_value: Numeric }>
  stock_movements: { stock_in: Count; stock_out: Count; movement_count: Count }
  low_stock: Array<{ ref: string; label: string; current_stock: Numeric; min_stock: Numeric }>
  total_stock_value: Numeric
}

export interface StatementPnl {
  revenue: Numeric
  purchases: Numeric
  gross_profit: Numeric
  gross_margin_pct: Numeric
  expenses: Numeric
  payroll: Numeric
  operating_profit: Numeric
  net_margin_pct: Numeric
  has_operations: boolean
}

export interface ActivityRow {
  act_date: string | null
  label: string | null
  customer: string | null
  fk_soc: number | null
  author: string | null
  fk_user_author: number | null
  priority: string | number | null
  activitystatus: string | null
  type_label?: string | null
  percent?: number | null
  status?: number | null
}

export interface ActivityGroup {
  calls: ActivityRow[]
  meetings: ActivityRow[]
  tasks: ActivityRow[]
}

export interface StatementActivities extends ActivityGroup {
  total_calls: Count
  total_meetings: Count
  total_tasks: Count
  created_today: ActivityGroup
  scheduled_today: ActivityGroup
}

export interface MonthlyStatement {
  success: boolean
  error?: string
  period: { year: number; month: number; start_date: string; end_date: string }
  sales: StatementSales
  sales_orders: StatementOrders
  purchases: StatementPurchases
  purchase_orders: StatementOrders
  proposals: StatementProposals
  expenses: StatementExpenses
  expense_details: StatementExpenseDetail[]
  payroll: StatementPayroll
  bank: StatementBank
  warehouse: StatementWarehouse
  customers: { total_customers: Count; active_customers: Count; new_customers: Count }
  pnl: StatementPnl
  activities: StatementActivities
}

export interface StatementInvoice {
  rowid: string | number
  ref: string
  datef: string
  total_ttc: Numeric
  date_lim_reglement: string | null
  customer?: string | null
  supplier?: string | null
}

export type InvoiceKind = 'sales' | 'purchase'
export type InvoiceGroup = 'paid' | 'unpaid' | 'previous_unpaid' | 'upcoming'

export async function loadMonthlyStatement(start: string, end: string): Promise<MonthlyStatement> {
  const res = await fetch(`${URL}?${new URLSearchParams({ start_date: start, end_date: end })}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`The monthly statement answered HTTP ${res.status}.`)
  const data = await parseLegacyJson<MonthlyStatement>(res)
  if (!data.success) throw new Error(data.error || 'The monthly statement answered with an error.')
  return data
}

// The invoices behind one of the counts (the classic page loads them when an accordion is opened: first page, 100 rows).
export async function loadStatementInvoices(type: InvoiceKind, status: InvoiceGroup, start: string, end: string): Promise<StatementInvoice[]> {
  const params = new URLSearchParams({ action: 'get_invoices', type, status, start_date: start, end_date: end, page: '1', limit: '100' })
  const res = await fetch(`${URL}?${params}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`The invoice list answered HTTP ${res.status}.`)
  const data = await parseLegacyJson<{ success?: boolean; invoices?: StatementInvoice[] }>(res)
  return data.invoices ?? []
}

export function useMonthlyStatement(start: string, end: string) {
  return useQuery({ queryKey: ['reports', 'monthlyStatement', start, end], queryFn: () => loadMonthlyStatement(start, end), staleTime: 60_000, retry: false })
}

export function useStatementInvoices(type: InvoiceKind, status: InvoiceGroup, start: string, end: string, enabled: boolean) {
  return useQuery({ queryKey: ['reports', 'monthlyStatement', 'invoices', type, status, start, end], queryFn: () => loadStatementInvoices(type, status, start, end), enabled, staleTime: 60_000, retry: false })
}

export interface StatementKpi {
  label: string
  value: string
  sub: string
  tone: 'green' | 'orange' | 'blue' | 'red' | 'rose' | 'purple' | 'teal' | 'indigo'
}

// The KPI cards of the classic page, with its own formulas: Expenses is the approved expense total minus the payroll paid, and its count
// leaves out the payroll employees; Operating Profit is only there when the period has operations; Bank Balance has no value, only one
// "CUR: amount" per currency.
export function statementKpis(d: MonthlyStatement): StatementKpi[] {
  const kpis: StatementKpi[] = [
    { label: 'Total Sales', value: fmt(d.sales.total_ttc), sub: `Paid: ${fmt(d.sales.paid_ttc)} | Unpaid: ${fmt(d.sales.unpaid_ttc)}`, tone: 'green' },
    { label: 'Purchases', value: fmt(d.purchases.total_ttc), sub: `${fmtInt(d.purchases.validated_count)} invoices`, tone: 'orange' },
    { label: 'Gross Profit', value: fmt(d.pnl.gross_profit), sub: `Revenue - Purchases | Margin: ${pct(d.pnl.gross_margin_pct)}`, tone: num(d.pnl.gross_profit) >= 0 ? 'blue' : 'red' },
    {
      label: 'Expenses',
      value: fmt(num(d.expenses.total_ttc) - num(d.payroll.paid_amount)),
      sub: `${fmtInt(num(d.expenses.total_count) - num(d.payroll.employee_count))} total (${num(d.expenses.draft_count)} draft)`,
      tone: 'rose',
    },
    { label: 'Payroll', value: fmt(d.payroll.paid_amount), sub: `${fmtInt(d.payroll.employee_count)} employees`, tone: 'purple' },
    { label: 'Bank Balance', value: '', sub: (d.bank.by_currency ?? []).map((c) => `${c.currency_code}: ${fmt(c.total_closing_balance)}`).join(' | '), tone: 'teal' },
    {
      label: 'CRM Activities',
      value: fmtInt(num(d.activities.total_calls) + num(d.activities.total_meetings) + num(d.activities.total_tasks)),
      sub: `${num(d.activities.total_calls)} calls | ${num(d.activities.total_meetings)} meetings`,
      tone: 'indigo',
    },
  ]
  if (d.pnl.has_operations) {
    kpis.splice(6, 0, {
      label: 'Operating Profit',
      value: fmt(d.pnl.operating_profit),
      sub: `Gross Profit - Expenses - Payroll | Net margin: ${pct(d.pnl.net_margin_pct)}`,
      tone: num(d.pnl.operating_profit) >= 0 ? 'green' : 'red',
    })
  }
  return kpis
}

export interface PnlRow {
  label: string
  value: number
  indent?: boolean
  total?: boolean
}

// "Profit & Loss Summary" rows as the classic page builds them (Less: Expenses = -expenses + payroll, as that page has it).
export function statementPnlRows(p: StatementPnl): PnlRow[] {
  const rows: PnlRow[] = [
    { label: 'Total Revenue', value: num(p.revenue) },
    { label: 'Less: Purchases', value: -num(p.purchases), indent: true },
    { label: 'Gross Profit', value: num(p.gross_profit), total: true },
    { label: 'Less: Expenses', value: -num(p.expenses) + num(p.payroll), indent: true },
    { label: 'Less: Payroll', value: -num(p.payroll), indent: true },
  ]
  if (p.has_operations) rows.push({ label: 'Operating Profit', value: num(p.operating_profit), total: true })
  return rows
}

// One bar per day of the month (the classic "Daily Sales Trend": days with no sales are 0). The endpoint groups the invoices by the day of the
// month (DAY(datef)) across the whole period, so a range over several months adds the same day of every month together; the classic page then
// draws only the days of the first month and loses the sales of day 31 of a 30-day month (1,440.00 of 31 Oct in a 1 Sep - 10 Nov range). The
// bars here run to the last day that has sales, so nothing is dropped.
export function statementDailySales(sales: StatementSales, period: { year: number; month: number }): Array<{ day: number; total: number }> {
  const lastTrendDay = sales.daily_trend.reduce((m, t) => Math.max(m, parseInt(String(t.day_num), 10) || 0), 0)
  const days = Math.max(new Date(period.year, period.month, 0).getDate(), lastTrendDay)
  return Array.from({ length: days }, (_, i) => {
    const found = sales.daily_trend.find((t) => parseInt(String(t.day_num), 10) === i + 1)
    return { day: i + 1, total: found ? num(found.daily_total) : 0 }
  })
}
