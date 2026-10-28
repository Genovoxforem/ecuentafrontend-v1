import type { FormOption } from './expensePagesParser'

// Row and page types of the Advances, Reimbursements, Repayments, Recurring, Reports and Analytics tabs of the
// expense module.

// Which colour the backend gave a number ("text-warning", "text-success"…).
export type Tone = 'warning' | 'info' | 'success' | 'danger' | 'primary' | 'none'
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

// ── Reports ──────────────────────────────────────────────────────────────────────────────────────────
export interface ReportsPage {
  filters: { yearFrom: string; monthFrom: string; yearTo: string; monthTo: string; dept: string; branch: string }
  months: FormOption[]
  byEmployee: { employee: string; count: string; ht: string; vat: string; ttc: string; paid: string }[]
  byType: { type: string; lines: string; ttc: string }[]
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
