import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { EntityOption, ExpenseListFilters, ExpenseReportRow, ExpenseTypeOption } from './expenses.queries'
import type { ApprovalRow, ExpenseDashboard, ExpenseParty, FormOption, PaymentAction, PaymentRow } from './expensePagesParser'
import type { AdvanceRow, AdvancesPage, AnalyticsPage, RecurringPage, RecurringRow, ReimbursementRow, ReimbursementsPage, ReportsPage, RepaymentRow, RepaymentsPage, Tone } from './expenseTabs.types'

// The expense module on expense/fapi (26 Oct 2026), replacing the {success, html} fragments of expense/api/expense_content.php (read by the
// parsers in expensePagesParser.ts / expenseTabs.types.ts) and the DataTables endpoints expense/ajax/*. The answers are mapped to the
// types those parsers produced, so the pages are unchanged. newecuenta holds no expense report, so every list there is empty: the rows
// the document gives a shape for ("from code") are typed exactly below; for the rows it gives none, the field names the document uses
// for the same thing elsewhere are read and a cell stays blank when its field is absent. None of these rows has been seen live.

type Row = Record<string, unknown>

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : null)
const pick = (r: Row, ...keys: string[]) => {
  for (const k of keys) {
    const v = r[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}
const money = (v: unknown) => {
  const n = num(v)
  return n === null ? '' : formatMoney(n)
}
// The module prints its dates as dd/mm/yyyy.
export const dmy = (iso: unknown) => {
  const [y, m, d] = str(iso).slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}
const TONES: Tone[] = ['warning', 'info', 'success', 'danger', 'primary']
const tone = (v: unknown): Tone => (TONES.includes(v as Tone) ? (v as Tone) : 'none')
const nameOf = (v: unknown) => (typeof v === 'string' ? v : v && typeof v === 'object' ? str(pick(v as Row, 'name', 'fullname', 'label')) : '')
const option = (value: unknown, label: unknown): FormOption => ({ value: str(value), label: str(label), selected: false })

interface FapiLinked {
  type: string
  id: number
  name: string
  icon?: string
}
// "Linked to" and the employee, as the pages draw them (a user links to the user page, a company to the company page).
export function mapLinked(l: FapiLinked | null | undefined): ExpenseParty | null {
  if (!l) return null
  const isUser = l.type === 'user' || l.type === 'employee'
  return {
    kind: isUser ? 'user' : 'company',
    icon: l.icon === 'truck' || l.type === 'vendor' ? 'truck' : isUser ? 'user' : 'building',
    id: str(l.id),
    name: l.name,
    href: isUser ? '' : `/societe/card.php?socid=${l.id}`,
    photo: '',
    enabled: null,
    facts: [],
  }
}

// ---- Overview, approvals, payments: content.php ------------------------------------------------------------------------------------------------

export interface FapiOverview {
  kpis: Array<{ label: string; value: number | string; display?: string; currency?: string; sub?: string }>
  months: string[]
  trend: number[]
  typeLabels: string[]
  typeData: number[]
  budgetYear: number | string
  budgets: Row[]
  recent: Row[]
  currency: string
}
export const mapOverview = (d: FapiOverview): ExpenseDashboard => ({
  kpis: d.kpis.map((k) => ({ label: k.label, value: k.display ?? str(k.value), currency: k.currency ?? '', sub: k.sub ?? '' })),
  months: d.months,
  trend: d.trend,
  typeLabels: d.typeLabels,
  typeData: d.typeData,
  currency: d.currency,
  budgetYear: str(d.budgetYear),
  budgets: d.budgets.map((b) => ({ label: str(b.label), pct: num(b.pct) ?? 0, used: money(pick(b, 'used_amount', 'used')), budget: money(pick(b, 'budget_amount', 'budget')) })),
  recent: d.recent.map((r) => ({
    id: str(r.id),
    ref: str(r.ref),
    user: nameOf(pick(r, 'user', 'employee')),
    amount: str(r.total_display) || money(r.total_ttc),
    status: str(pick(r, 'status_label', 'status')),
    date: dmy(pick(r, 'date_create', 'date')),
  })),
})
export const loadOverview = async () => mapOverview(await fapiGet<FapiOverview>('/expense/fapi/content.php', { action: 'overview' }))

export interface FapiApproval {
  n: number
  id: number
  ref: string
  employee: string
  date_debut: string
  date_fin: string
  linked_to: FapiLinked | null
  total_ttc: number
  total_display?: string
  status_label: string
}
export const mapApprovals = (d: { rows: FapiApproval[] }): ApprovalRow[] =>
  d.rows.map((r) => ({
    n: r.n,
    id: str(r.id),
    ref: r.ref,
    employee: r.employee,
    period: `${dmy(r.date_debut)} – ${dmy(r.date_fin)}`,
    linkedTo: mapLinked(r.linked_to),
    totalTtc: r.total_display ?? formatMoney(r.total_ttc),
    status: r.status_label,
  }))
export const loadApprovals = async () => mapApprovals(await fapiGet<{ rows: FapiApproval[] }>('/expense/fapi/content.php', { action: 'approvals' }))

export interface FapiPayment {
  n: number
  id: number
  ref: string
  employee: string
  date_debut: string
  date_fin: string
  total_ttc: number
  advance: number
  net_payable: number
  net_tone: 'owed' | 'surplus' | 'settled'
  total_paid: number
  paid: boolean
  status_label: string
  action: { kind: string; amount?: number; label: string }
}
const mapPaymentAction = (a: FapiPayment['action']): PaymentAction =>
  a.kind === 'pay' && typeof a.amount === 'number' ? { kind: 'pay', amount: a.amount, label: a.label } : a.kind === 'collect' ? { kind: 'collect', label: a.label } : { kind: 'settled', label: a.label }
export const mapPayments = (d: { rows: FapiPayment[]; note?: string }): { rows: PaymentRow[]; note: string } => ({
  rows: d.rows.map((r) => ({
    n: r.n,
    id: str(r.id),
    ref: r.ref,
    employee: r.employee,
    period: `${dmy(r.date_debut)} – ${dmy(r.date_fin)}`,
    totalTtc: formatMoney(r.total_ttc),
    advance: r.advance ? formatMoney(r.advance) : '-',
    netPayable: formatMoney(r.net_payable),
    netTone: r.net_tone,
    totalPaid: formatMoney(r.total_paid),
    status: r.status_label,
    paid: r.paid,
    action: mapPaymentAction(r.action),
  })),
  note: d.note ?? '',
})
export const loadPayments = async () => mapPayments(await fapiGet<{ rows: FapiPayment[]; note?: string }>('/expense/fapi/content.php', { action: 'payments' }))

// ---- The report list: list.php ----------------------------------------------------------------------------------------------------------------

export interface FapiExpenseListItem {
  id: number
  ref: string
  user: { id: number; name: string; login: string; email: string }
  linked_to: FapiLinked | null
  date_debut: string
  date_fin: string
  date_create: string
  total_ht: number
  total_tva: number
  total_ttc: number
  total_display?: string
  status_label: string
  paid: boolean
  notes: string
}
export const mapExpenseListItem = (r: FapiExpenseListItem): ExpenseReportRow => ({
  id: r.id,
  ref: r.ref,
  linkedTo: r.linked_to?.name ?? '',
  user: r.user.name,
  dateStart: dmy(r.date_debut),
  dateEnd: dmy(r.date_fin),
  dateCreate: dmy(r.date_create),
  totalHt: formatMoney(r.total_ht),
  totalTva: formatMoney(r.total_tva),
  totalTtc: r.total_display ?? formatMoney(r.total_ttc),
  status: r.status_label,
  paid: r.paid,
  notes: r.notes ?? '',
  userParty: { kind: 'user', icon: 'user', id: str(r.user.id), name: r.user.name, href: '', photo: '', enabled: null, facts: [] },
  linkedParty: mapLinked(r.linked_to),
})
// length <= 0 asks for everything (limit=0). page is 0-based here, 1-based on the endpoint.
export async function loadExpenseList(filters: ExpenseListFilters, page: number, length: number) {
  const d = await fapiGet<{ items: FapiExpenseListItem[]; pagination: { total: number } }>('/expense/fapi/list.php', {
    q: filters.search || undefined,
    status: filters.status || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    sort: filters.orderBy,
    order: filters.orderDir,
    page: length > 0 ? page + 1 : undefined,
    limit: length > 0 ? length : 0,
  })
  // the endpoint counts the matching rows only: there is no count of all the reports
  return { rows: d.items.map(mapExpenseListItem), total: d.pagination.total, filtered: d.pagination.total }
}

// ---- Dropdown feeds: types.php, entity_search.php -----------------------------------------------------------------------------------------

export const loadExpenseTypes = async (): Promise<ExpenseTypeOption[]> =>
  (await fapiGet<{ items: Array<{ id: number; text: string }> }>('/expense/fapi/types.php', { limit: 200 })).items.map((t) => ({ id: t.id, label: t.text }))
export const searchEntities = async (type: 'user' | 'customer' | 'vendor', q: string): Promise<EntityOption[]> =>
  (await fapiGet<{ results: EntityOption[] }>('/expense/fapi/entity_search.php', { type, q })).results

// ---- Advances: advances.php -----------------------------------------------------------------------------------------------------------------

export interface FapiAdvances {
  can_create: boolean
  employees: Array<{ id: number; name: string }>
  banks: Array<{ id: number; label: string; number: string }>
  rows: Row[]
}
const bankOption = (b: { id: number; label: string; number?: string }) => option(b.id, b.number ? `${b.label} (${b.number})` : b.label)
export const mapAdvances = (d: FapiAdvances): AdvancesPage => ({
  canCreate: d.can_create,
  employees: d.employees.map((e) => option(e.id, e.name)),
  banks: d.banks.map(bankOption),
  rows: d.rows.map((r, i): AdvanceRow => {
    const balance = num(r.balance) ?? 0
    return {
      n: String(i + 1),
      id: str(r.id),
      ref: str(r.ref),
      employee: str(r.employee),
      amount: money(r.amount),
      repaid: money(r.repaid),
      balance: money(r.balance),
      balanceTone: tone(r.balance_tone),
      method: str(r.method),
      date: dmy(r.date_advance),
      status: str(r.status_label),
      bankEntry: nameOf(r.bank_entry),
      repayDate: dmy(r.repay_date) || '-',
      repayEntry: nameOf(r.repay_entry) || '-',
      repaidBy: nameOf(r.repaid_by) || '-',
      reconciledTo: nameOf(r.reconciled_to) || '-',
      settlement: str(r.settlement_label) || '-',
      repay: r.can_repay === true ? { ref: str(r.ref), employee: str(r.employee), balance: String(balance) } : null,
    }
  }),
})
export const loadAdvances = async () => mapAdvances(await fapiGet<FapiAdvances>('/expense/fapi/advances.php'))

// ---- Reimbursements: reimbursements.php --------------------------------------------------------------------------------------------------------

export interface FapiReimbursements {
  can_create: boolean
  reports: Row[]
  recipients: { employees: Array<{ id: number; name: string }>; customers: Array<{ id: number; name: string }> }
  rows: Row[]
}
export const mapReimbursements = (d: FapiReimbursements): ReimbursementsPage => ({
  canCreate: d.can_create,
  reports: d.reports.map((r) => ({
    ...option(pick(r, 'id', 'report_id'), pick(r, 'ref', 'label')),
    amount: str(pick(r, 'total_ttc', 'amount')),
    expenseType: str(r.expense_type),
    socid: str(r.socid),
    employeeId: str(pick(r, 'employeeid', 'fk_user_author')),
  })),
  recipients: [
    ...d.recipients.employees.map((e) => ({ ...option(e.id, e.name), type: 'employee' })),
    ...d.recipients.customers.map((c) => ({ ...option(c.id, c.name), type: 'customer' })),
  ],
  rows: d.rows.map((r, i): ReimbursementRow => ({
    n: String(i + 1),
    reportId: str(r.report_id),
    ref: str(r.ref),
    recipient: str(r.recipient),
    recipientType: str(pick(r, 'recipient_type_label', 'recipient_type')),
    gross: money(r.gross),
    advance: money(r.advance_deducted),
    net: money(r.net_claim),
    paid: money(r.paid),
    balance: money(r.balance),
    balanceTone: tone(r.balance_tone),
    status: str(r.status_label),
    date: dmy(r.date),
    receiptId: str(r.id),
  })),
})
export const loadReimbursements = async () => mapReimbursements(await fapiGet<FapiReimbursements>('/expense/fapi/reimbursements.php'))

// ---- Repayments: repayments.php -----------------------------------------------------------------------------------------------------------------

export interface FapiRepayments {
  can_create: boolean
  reports: Row[]
  banks: Array<{ id: number; label: string; number?: string }>
  rows: Row[]
}
export const mapRepayments = (d: FapiRepayments): RepaymentsPage => ({
  canCreate: d.can_create,
  reports: d.reports.map((r) => ({ ...option(pick(r, 'id', 'report_id'), pick(r, 'ref', 'label')), amount: str(pick(r, 'total_ttc', 'amount')) })),
  banks: d.banks.map(bankOption),
  rows: d.rows.map((r, i): RepaymentRow => ({
    n: String(i + 1),
    reportId: str(r.report_id),
    ref: str(r.ref),
    employee: str(r.employee),
    gross: money(r.gross_expense),
    advance: money(r.advance_used),
    owes: money(r.employee_owes),
    collected: money(r.collected),
    balance: money(r.balance),
    balanceTone: tone(r.balance_tone),
    method: str(r.method),
    status: str(r.status_label),
    date: dmy(r.date),
    // a repayment has no id of its own in the row: it is the report's
    receiptId: str(r.report_id),
    canApprove: r.can_approve === true,
    collect: r.can_collect === true ? { ref: str(r.ref), balance: String(num(r.balance) ?? 0), method: str(r.method) } : null,
  })),
})
export const loadRepayments = async () => mapRepayments(await fapiGet<FapiRepayments>('/expense/fapi/repayments.php'))

// ---- Recurring: recurring.php (+ toggle_active) -------------------------------------------------------------------------------------------------

export interface FapiRecurring {
  can_create: boolean
  templates: Row[]
  frequencies: Array<{ value: string; label: string }>
  rows: Array<{
    id: number
    template_id: number
    ref: string
    frequency_label: string
    date_start: string
    date_end: string | null
    next_run: string | null
    auto_create: boolean
    active: boolean
  }>
}
export const mapRecurring = (d: FapiRecurring): RecurringPage => ({
  canCreate: d.can_create,
  templates: d.templates.map((t) => option(pick(t, 'id', 'template_id'), pick(t, 'ref', 'label'))),
  frequencies: d.frequencies.map((f) => option(f.value, f.label)),
  rows: d.rows.map((r, i): RecurringRow => ({
    n: String(i + 1),
    templateId: str(r.template_id),
    ref: r.ref,
    frequency: r.frequency_label,
    start: dmy(r.date_start),
    end: dmy(r.date_end),
    nextRun: dmy(r.next_run),
    autoCreate: r.auto_create ? 'Yes' : 'No',
    active: r.active ? 'Active' : 'Paused',
    toggle: { rid: str(r.id), active: r.active ? '0' : '1', label: r.active ? 'Pause' : 'Resume' },
  })),
})
export const loadRecurring = async () => mapRecurring(await fapiGet<FapiRecurring>('/expense/fapi/recurring.php'))
// Without confirm the endpoint only answers a dry run; confirm: true is what changes the schedule.
export const toggleRecurring = (id: string, active: boolean) => fapiPost('/expense/fapi/recurring.php', { id: Number(id), active, confirm: true }, { action: 'toggle_active' })

// ---- Reports and analytics: reports.php, analytics.php ------------------------------------------------------------------------------------------

export interface FapiReports {
  filters: { year_from: number; month_from: number; year_to: number; month_to: number; dept: string; branch: string }
  months: Array<{ value: number; label: string }>
  by_employee: Row[]
  by_type: Row[]
}
export const mapReports = (d: FapiReports): ReportsPage => ({
  filters: { yearFrom: str(d.filters.year_from), monthFrom: str(d.filters.month_from), yearTo: str(d.filters.year_to), monthTo: str(d.filters.month_to), dept: d.filters.dept ?? '', branch: d.filters.branch ?? '' },
  months: d.months.map((m) => option(m.value, m.label)),
  byEmployee: d.by_employee.map((r) => ({
    employee: str(pick(r, 'employee', 'name', 'user')),
    count: str(pick(r, 'count', 'nb')),
    ht: money(pick(r, 'total_ht', 'ht')),
    vat: money(pick(r, 'total_tva', 'vat', 'tva')),
    ttc: money(pick(r, 'total_ttc', 'ttc')),
    paid: money(pick(r, 'paid_ttc', 'total_paid', 'paid')),
  })),
  byType: d.by_type.map((r) => ({ type: str(pick(r, 'type', 'label')), lines: str(pick(r, 'lines', 'count', 'nb')), ttc: money(pick(r, 'total_ttc', 'ttc')) })),
})
export const loadReports = async (f: { yearFrom: string; monthFrom: string; yearTo: string; monthTo: string; dept: string; branch: string } | null) =>
  mapReports(
    await fapiGet<FapiReports>(
      '/expense/fapi/reports.php',
      f ? { year_from: f.yearFrom, month_from: f.monthFrom, year_to: f.yearTo, month_to: f.monthTo, dept: f.dept || undefined, branch: f.branch || undefined } : undefined,
    ),
  )

export interface FapiAnalytics {
  year: number
  currency: string
  monthly: Array<{ month: string; amount: number; count: number }>
  employees: Row[]
  types: Row[]
  departments: Row[]
}
const topN = (rows: Row[]) => rows.map((r) => ({ label: str(pick(r, 'label', 'name', 'employee', 'type', 'department')), amount: num(pick(r, 'amount', 'total')) ?? 0 }))
export const mapAnalytics = (d: FapiAnalytics): AnalyticsPage => ({
  year: str(d.year),
  currency: d.currency,
  months: d.monthly.map((m) => m.month),
  amounts: d.monthly.map((m) => m.amount),
  counts: d.monthly.map((m) => m.count),
  employees: topN(d.employees),
  types: topN(d.types),
  departments: topN(d.departments),
})
export const loadAnalytics = async (year: string | null) => mapAnalytics(await fapiGet<FapiAnalytics>('/expense/fapi/analytics.php', year ? { year } : undefined))

// ---- Budgets: budgets.php (+ create) -----------------------------------------------------------------------------------------------------------

export interface FapiBudgetRow {
  id: number
  label: string
  period_label: string
  department: string | null
  branch: string | null
  budget_amount: number
  committed_amount: number
  used_amount: number
  pct: number
  bar_tone: string
}
export interface BudgetRow {
  id: number
  label: string
  period: string
  budget: string
  used: string
  department: string
  branch: string
  pct: number
  tone: Tone
}
export interface BudgetsPage {
  year: string
  rows: BudgetRow[]
}
export const mapBudgets = (d: { filter_year: number; rows: FapiBudgetRow[] }): BudgetsPage => ({
  year: str(d.filter_year),
  rows: d.rows.map((r) => ({ id: r.id, label: r.label, period: r.period_label, budget: formatMoney(r.budget_amount), used: formatMoney(r.used_amount), department: r.department ?? '', branch: r.branch ?? '', pct: r.pct, tone: tone(r.bar_tone) })),
})
export const loadBudgets = async (year: string) => mapBudgets(await fapiGet<{ filter_year: number; rows: FapiBudgetRow[] }>('/expense/fapi/budgets.php', { year }))

export interface NewBudgetInput {
  label: string
  amount: string
  year: string
  month: string
  department: string
  branch: string
}
// Without confirm the endpoint answers a dry-run plan and writes nothing; confirm: true inserts the budget.
export const createBudget = (i: NewBudgetInput) =>
  fapiPost(
    '/expense/fapi/budgets.php',
    {
      label: i.label.trim(),
      budget_amount: Number(i.amount.replace(/,/g, '')),
      period_year: Number(i.year) || undefined,
      period_month: i.month ? Number(i.month) : undefined,
      department: i.department.trim() || undefined,
      branch: i.branch.trim() || undefined,
      confirm: true,
    },
    { action: 'create' },
  )

// ---- Receipts of a report: documents.php (GET) --------------------------------------------------------------------------------------------------

export interface FapiExpenseDocuments {
  total_size_formatted: string
  files: Array<{ name: string; size_formatted: string; date: string; ext: string; download_url: string; thumb_url: string | null }>
}
export const mapExpenseDocuments = (d: FapiExpenseDocuments) => ({
  files: d.files.map((f) => ({ name: f.name, size: f.size_formatted, date: dmy(f.date), ext: f.ext, downloadUrl: f.download_url, thumbUrl: f.thumb_url ?? '' })),
  totalSize: d.total_size_formatted,
})
export const loadExpenseDocuments = async (id: string) => mapExpenseDocuments(await fapiGet<FapiExpenseDocuments>('/expense/fapi/documents.php', { id }))
