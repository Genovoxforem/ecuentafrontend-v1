import { scriptArray, type FormOption } from './expensePagesParser'

// Advances, Reimbursements, Repayments, Recurring, Reports and Analytics are server-rendered pages of the
// expense module (expense/api/expense_content.php?action=<tab>). Their tables are printed in full with the
// forms above them; these parsers read both.

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
const parseHtml = (html: string) => new DOMParser().parseFromString(html, 'text/html')
const BASE = 'http://backend.invalid'

const idOf = (a: Element | null | undefined, param = 'id') => (a ? new URL(a.getAttribute('href') ?? '', BASE).searchParams.get(param) : null)

// The cells of every body row of a table (skipping DataTables' "no data" filler row).
function bodyRows(doc: Document, tableId: string): Element[][] {
  return Array.from(doc.querySelectorAll(`#${tableId} tbody tr`))
    .map((tr) => Array.from(tr.children).filter((c) => c.tagName === 'TD'))
    .filter((cells) => cells.length > 2)
}

const options = (doc: Document, selector: string): FormOption[] =>
  Array.from(doc.querySelectorAll(`${selector} option`)).map((o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: text(o), selected: o.hasAttribute('selected') }))

// Which colour the backend gave a number ("text-warning", "text-success"…).
export type Tone = 'warning' | 'info' | 'success' | 'danger' | 'primary' | 'none'
const toneOf = (el: Element | null | undefined): Tone => {
  for (const t of ['warning', 'info', 'success', 'danger', 'primary'] as const) if (el?.classList.contains(`text-${t}`)) return t
  return 'none'
}

// ── Advances ─────────────────────────────────────────────────────────────────────────────────────────
export interface AdvanceRow {
  n: string
  id: string
  ref: string
  employee: string
  amount: string
  repaid: string
  balance: string
  balanceTone: Tone
  method: string
  date: string
  status: string
  bankEntry: string
  repayDate: string
  repayEntry: string
  repaidBy: string
  reconciledTo: string
  settlement: string
  // The "Repay" button, when the advance is open and something is still owed.
  repay: { ref: string; employee: string; balance: string } | null
}
export interface AdvancesPage {
  canCreate: boolean
  employees: FormOption[]
  banks: FormOption[]
  rows: AdvanceRow[]
}

export function parseAdvances(html: string): AdvancesPage {
  const doc = parseHtml(html)
  const rows = bodyRows(doc, 'adv-table').map((c): AdvanceRow => {
    const button = c[15]?.querySelector('.adv-repay-btn')
    return {
      n: text(c[0]),
      id: idOf(c[1]?.querySelector('a')) ?? '',
      ref: text(c[1]),
      employee: text(c[2]),
      amount: text(c[3]),
      repaid: text(c[4]),
      balance: text(c[5]),
      balanceTone: toneOf(c[5]),
      method: text(c[6]),
      date: text(c[7]),
      status: text(c[8]),
      bankEntry: text(c[9]),
      repayDate: text(c[10]),
      repayEntry: text(c[11]),
      repaidBy: text(c[12]),
      reconciledTo: text(c[13]),
      settlement: text(c[14]),
      repay: button ? { ref: button.getAttribute('data-ref') ?? '', employee: button.getAttribute('data-emp') ?? '', balance: button.getAttribute('data-balance') ?? '' } : null,
    }
  })
  return { canCreate: Boolean(doc.querySelector('#advForm')), employees: options(doc, 'select[name="fk_user"]'), banks: options(doc, '#adv_accountid'), rows }
}

// ── Reimbursements ───────────────────────────────────────────────────────────────────────────────────
export interface ReimbursementRow {
  n: string
  reportId: string
  ref: string
  recipient: string
  recipientType: string
  gross: string
  advance: string
  net: string
  paid: string
  balance: string
  balanceTone: Tone
  status: string
  date: string
  receiptId: string
}
export interface ReimbursementReportOption extends FormOption {
  amount: string
  expenseType: string
  socid: string
  employeeId: string
}
export interface ReimbursementRecipient extends FormOption {
  type: string
}
export interface ReimbursementsPage {
  canCreate: boolean
  reports: ReimbursementReportOption[]
  recipients: ReimbursementRecipient[]
  rows: ReimbursementRow[]
}

export function parseReimbursements(html: string): ReimbursementsPage {
  const doc = parseHtml(html)
  const rows = bodyRows(doc, 'reimburse-table').map((c): ReimbursementRow => {
    const badge = c[2]?.querySelector('.badge')
    const recipient = text(c[2]).replace(text(badge), '').trim()
    return {
      n: text(c[0]),
      reportId: idOf(c[1]?.querySelector('a')) ?? '',
      ref: text(c[1]),
      recipient,
      recipientType: text(badge),
      gross: text(c[3]),
      advance: text(c[4]),
      net: text(c[5]),
      paid: text(c[6]),
      balance: text(c[7]),
      balanceTone: toneOf(c[7]),
      status: text(c[8]),
      date: text(c[9]),
      receiptId: idOf(c[10]?.querySelector('a[href*="reimbursement_receipt"]')) ?? '',
    }
  })
  return {
    canCreate: Boolean(doc.querySelector('#reimburseForm')),
    reports: Array.from(doc.querySelectorAll('select[name="fk_expensereport"] option')).map((o) => ({
      value: (o.getAttribute('value') ?? '').trim(),
      label: text(o),
      selected: false,
      amount: o.getAttribute('data-amount') ?? '',
      expenseType: o.getAttribute('data-expense-type') ?? '',
      socid: o.getAttribute('data-socid') ?? '',
      employeeId: o.getAttribute('data-employeeid') ?? '',
    })),
    recipients: Array.from(doc.querySelectorAll('#recipient-select option')).map((o) => ({
      value: (o.getAttribute('value') ?? '').trim(),
      label: text(o),
      selected: false,
      type: o.getAttribute('data-type') ?? '',
    })),
    rows,
  }
}

// ── Repayments ───────────────────────────────────────────────────────────────────────────────────────
export interface RepaymentRow {
  n: string
  reportId: string
  ref: string
  employee: string
  gross: string
  advance: string
  owes: string
  collected: string
  balance: string
  balanceTone: Tone
  method: string
  status: string
  date: string
  receiptId: string
  // Pending repayments can be approved (which sends them to Payments); approved ones with a balance can be collected.
  canApprove: boolean
  collect: { ref: string; balance: string; method: string } | null
}
export interface RepaymentReportOption extends FormOption {
  amount: string
}
export interface RepaymentsPage {
  canCreate: boolean
  reports: RepaymentReportOption[]
  banks: FormOption[]
  rows: RepaymentRow[]
}

export function parseRepayments(html: string): RepaymentsPage {
  const doc = parseHtml(html)
  const rows = bodyRows(doc, 'repay-table').map((c): RepaymentRow => {
    const collect = c[11]?.querySelector('.repay-collect-btn')
    return {
      n: text(c[0]),
      reportId: idOf(c[1]?.querySelector('a')) ?? '',
      ref: text(c[1]),
      employee: text(c[2]),
      gross: text(c[3]),
      advance: text(c[4]),
      owes: text(c[5]),
      collected: text(c[6]),
      balance: text(c[7]),
      balanceTone: toneOf(c[7]),
      method: text(c[8]),
      status: text(c[9]),
      date: text(c[10]),
      receiptId: idOf(c[11]?.querySelector('a[href*="repayment_receipt"]')) ?? '',
      canApprove: Boolean(c[11]?.querySelector('.repay-approve-btn')),
      collect: collect ? { ref: collect.getAttribute('data-ref') ?? '', balance: collect.getAttribute('data-balance') ?? '', method: collect.getAttribute('data-method') ?? '' } : null,
    }
  })
  return {
    canCreate: Boolean(doc.querySelector('#repayForm')),
    reports: Array.from(doc.querySelectorAll('#repayForm select[name="fk_expensereport"] option')).map((o) => ({
      value: (o.getAttribute('value') ?? '').trim(),
      label: text(o),
      selected: false,
      amount: o.getAttribute('data-amount') ?? '',
    })),
    banks: options(doc, '#collect_accountid'),
    rows,
  }
}

// ── Recurring ────────────────────────────────────────────────────────────────────────────────────────
export interface RecurringRow {
  n: string
  templateId: string
  ref: string
  frequency: string
  start: string
  end: string
  nextRun: string
  autoCreate: string
  active: string
  // The Pause / Resume link's own target: which template and the state it switches to.
  toggle: { rid: string; active: string; label: string } | null
}
export interface RecurringPage {
  canCreate: boolean
  templates: FormOption[]
  frequencies: FormOption[]
  rows: RecurringRow[]
}

export function parseRecurring(html: string): RecurringPage {
  const doc = parseHtml(html)
  const rows = bodyRows(doc, 'recurring-table').map((c): RecurringRow => {
    const a = c[8]?.querySelector('a[href*="toggle_active"]')
    const q = a ? new URL(a.getAttribute('href') ?? '', BASE).searchParams : null
    return {
      n: text(c[0]),
      templateId: idOf(c[1]?.querySelector('a')) ?? '',
      ref: text(c[1]),
      frequency: text(c[2]),
      start: text(c[3]),
      end: text(c[4]),
      nextRun: text(c[5]),
      autoCreate: text(c[6]),
      active: text(c[7]),
      toggle: a && q ? { rid: q.get('rid') ?? '', active: q.get('active') ?? '', label: text(a) } : null,
    }
  })
  return { canCreate: Boolean(doc.querySelector('#recurringForm')), templates: options(doc, 'select[name="fk_expensereport_tpl"]'), frequencies: options(doc, 'select[name="frequency"]'), rows }
}

// ── Reports ──────────────────────────────────────────────────────────────────────────────────────────
export interface ReportsPage {
  filters: { yearFrom: string; monthFrom: string; yearTo: string; monthTo: string; dept: string; branch: string }
  months: FormOption[]
  byEmployee: { employee: string; count: string; ht: string; vat: string; ttc: string; paid: string }[]
  byType: { type: string; lines: string; ttc: string }[]
}

export function parseReports(html: string): ReportsPage {
  const doc = parseHtml(html)
  const val = (name: string) => doc.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.getAttribute('value') ?? ''
  const monthSelect = (name: string) => options(doc, `select[name="${name}"]`)
  return {
    filters: {
      yearFrom: val('year_from'),
      monthFrom: monthSelect('month_from').find((o) => o.selected)?.value ?? '1',
      yearTo: val('year_to'),
      monthTo: monthSelect('month_to').find((o) => o.selected)?.value ?? '12',
      dept: val('dept'),
      branch: val('branch'),
    },
    months: monthSelect('month_from'),
    byEmployee: bodyRows(doc, 'report-by-user').map((c) => ({ employee: text(c[0]), count: text(c[1]), ht: text(c[2]), vat: text(c[3]), ttc: text(c[4]), paid: text(c[5]) })),
    byType: bodyRows(doc, 'report-by-type').map((c) => ({ type: text(c[0]), lines: text(c[1]), ttc: text(c[2]) })),
  }
}

// ── Analytics ────────────────────────────────────────────────────────────────────────────────────────
export interface AnalyticsPage {
  year: string
  currency: string
  months: string[]
  amounts: number[]
  counts: number[]
  employees: { label: string; amount: number }[]
  types: { label: string; amount: number }[]
  departments: { label: string; amount: number }[]
}

// The page hands its chart data to the browser as `ANALYTICS_DATA = { months: [...], amts: [...], … }`.
export function parseAnalytics(html: string): AnalyticsPage {
  const doc = parseHtml(html)
  const script =
    Array.from(doc.querySelectorAll('script'))
      .map((s) => s.textContent ?? '')
      .find((s) => s.includes('ANALYTICS_DATA')) ?? ''
  const pairs = (labels: string, amounts: string) => {
    const l = scriptArray<string>(script, labels)
    const a = scriptArray<number>(script, amounts)
    return l.map((label, i) => ({ label, amount: a[i] ?? 0 }))
  }
  return {
    year: doc.querySelector<HTMLInputElement>('input[name="year"]')?.getAttribute('value') ?? '',
    currency: script.match(/currency:\s*'([^']*)'/)?.[1] ?? '',
    months: scriptArray<string>(script, 'months'),
    amounts: scriptArray<number>(script, 'amts'),
    counts: scriptArray<number>(script, 'cnts'),
    employees: pairs('empLabels', 'empAmts'),
    types: pairs('typeLabels', 'typeAmts'),
    departments: pairs('deptLabels', 'deptAmts'),
  }
}
