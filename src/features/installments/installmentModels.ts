// Shapes of the Installment Sales answers, copied from real responses of newecuenta (12 Nov 2026).
export interface InstallmentRights {
  read: boolean
  create: boolean
  edit: boolean
  delete: boolean
  cancel: boolean
  pay: boolean
  receipt_read: boolean
  receipt_write: boolean
  report: boolean
  export: boolean
  ledger: boolean
  setup: boolean
  template: boolean
  accounting: boolean
  invoice_create: boolean
  invoice_validate?: boolean
}

export type PlanStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type ScheduleStatus = 'pending' | 'partial' | 'paid' | 'overdue'
export type PaymentStatus = 'valid' | 'reversed' | 'cancelled'

export interface DashboardData {
  kpi: { plans: number; total: number; collected: number; outstanding: number; overdue: number; overdue_installments: number; collection_rate: number; pending: number; paid: number; partial: number }
  currency: string
  monthly: Array<{ month: string; amount: number }>
  trend: { due: Array<{ month: string; amount: number }>; collected: Array<{ month: string; amount: number }> }
  status: { paid: number; partial: number; pending: number; overdue: number }
  aging: Record<string, number>
  performance: Array<{ label: string; total: number; paid: number }>
  top_customers: Array<{ label: string; amount: number }>
  calendar: Array<{ date: string; count: number; amount: number }>
}

export interface PlanRow {
  id: number
  ref: string
  invoice_id: number
  invoice_ref: string
  customer_id: number
  customer: string
  invoice_total: number
  eligible: number
  total: number
  paid: number
  outstanding: number
  count: number
  next_due: string | null
  currency: string
  status: PlanStatus
  overdue: boolean
  overdue_count: number
  progress: number
  template: string | null
  created: string
  interest_rate: number
  principal: number
  interest: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface PlanList {
  items: PlanRow[]
  pagination: Pagination
  totals: { plans: number; amount: number; paid: number; outstanding: number }
  rights: InstallmentRights
}

export interface TemplateLine {
  percent: number
  interval_value: number
  interval_unit: string
  label: string
}

export interface PlanTemplate {
  id: number
  ref: string
  label: string
  description: string
  frequency: string
  count: number
  grace_days: number
  is_default: boolean
  interest_rate: number
  lines: TemplateLine[]
}

export interface TemplateList {
  items: PlanTemplate[]
  settings: { interest_product: number; max: number; grace_days: number; precision: number }
}

export interface CustomerHit {
  id: number
  name: string
  code?: string
  tpin?: string
  town?: string | null
}

export interface OpenInvoice {
  id: number
  ref: string
  date: string
  customer_id: number
  customer: string
  total: number
  remain: number
  paid: number
  currency: string
}

export interface InvoiceState {
  total: number
  paid: number
  credit_notes: number
  deposits: number
  remain: number
  status: number
  draft: boolean
  eligible_reason: string
  currency: string
  rate: number
  foreign: boolean
}

export interface InvoiceLine {
  id: number
  product: string
  label: string
  qty: number
  unit_price: number
  discount: number
  vat: number
  total_ht: number
  total_ttc: number
}

export interface InvoiceForPlan {
  id: number
  ref: string
  date: string
  due: string
  customer: { id: number; name: string; tpin: string; address: string }
  ref_client: string
  project_id: number
  total_ht: number
  total_tva: number
  total_ttc: number
  state: InvoiceState
  lines: InvoiceLine[]
  payments: Array<{ ref: string; date: string; amount: number }>
  interest: number
  live_plan: { id: number; ref: string } | null
  can_plan: boolean
  url: string
}

export interface ProductHit {
  id: number
  ref: string
  label: string
  type: string
  price_ht: number
  vat_rate: string | number
}

export interface PreviewRow {
  label: string
  due_date: string
  percent: number
  amount: number
  principal?: number
  interest?: number
  rounding_adjustment?: number
}

export interface PreviewTotals {
  percent: number
  amount: number
  principal: number
  interest: number
  interest_rate: number
  eligible: number
  count: number
  first_due: string
  last_due: string
}

export interface PreviewResult {
  rows: PreviewRow[]
  totals: PreviewTotals
  errors: Record<string, string[]>
}

export interface PayMode {
  id: number
  code?: string
  label: string
}

export interface PayAccount {
  id: number
  ref?: string
  label: string
  currency?: string
  kind: string
  account_number?: string
}

export interface ScheduleRow {
  id: number
  num: number
  ref: string
  label: string
  due_date: string
  percent: number
  amount: number
  principal: number
  interest: number
  paid: number
  outstanding: number
  status: ScheduleStatus
}

export interface PlanPayment {
  payment_id: number
  ref: string
  date: string
  amount: number
  status: PaymentStatus
  mode: string
  bank: string
  reference: string
  receipt_id: number | null
  receipt_ref: string
  receipt_status: string
  allocations: Array<{ installment: number | string; amount: number }>
}

export interface PlanDetail {
  plan: {
    id: number
    ref: string
    status: PlanStatus
    currency: string
    invoice_total: number
    paid_before: number
    eligible: number
    total: number
    paid: number
    outstanding: number
    count: number
    frequency: string
    start_date: string
    grace_days: number
    note: string
    template: string | null
    template_id: number | null
    created: string
    next_due: string | null
    counts: { paid: number; pending: number; partial: number; overdue: number }
    progress: number
    has_payments: boolean
    interest_rate: number
    principal: number
    interest: number
  }
  invoice: { id: number; ref: string; date: string; customer: string; tpin?: string; url: string; state: InvoiceState; unallocated_payments: number }
  schedule: ScheduleRow[]
  payments: PlanPayment[]
  ledger: Array<{ date: string; piece_num: number; journal: string; type: string; account: string; account_label: string; label: string; debit: number; credit: number }> | null
  history: Array<{ date: string; action: string; label: string; user: string | null; previous?: unknown }>
  rights: InstallmentRights
}

export interface PaymentOptions {
  modes: PayMode[]
  accounts: PayAccount[]
  currency: string
  today: string
  defaults: { mode_id: number; bank_account: number; cash_account: number }
  rules: { allow_partial: boolean; min_payment: number; allocation: string; bank_required: boolean }
  rights: InstallmentRights
  plan?: {
    id: number
    ref: string
    status: PlanStatus
    currency: string
    customer: string
    customer_tpin?: string
    invoice_ref: string
    total: number
    paid: number
    outstanding: number
    max_payment: number
    invoice_remain: number
    foreign?: boolean
    rate?: number
    schedule: Array<Pick<ScheduleRow, 'id' | 'num' | 'ref' | 'label' | 'due_date' | 'amount' | 'paid' | 'outstanding' | 'status'>>
  }
}

export interface PaymentRow {
  receipt_id: number
  receipt_ref: string
  payment_id: number | null
  payment_ref: string
  date: string
  amount: number
  currency: string
  status: PaymentStatus
  plan_id: number
  plan_ref: string
  invoice_ref: string
  customer: string
  mode: string
  reference: string
  printed: number
}

export interface PaymentList {
  items: PaymentRow[]
  pagination: Pagination
  totals: { collected: number }
  rights: InstallmentRights
  modes?: PayMode[]
}

export interface ReceiptData {
  id: number
  ref: string
  date: string
  status: string
  plan_id: number
  plan_ref: string
  invoice_ref: string
  customer: string
  customer_tpin?: string
  customer_email?: string
  payment_ref: string
  reference: string
  mode: string
  account: string
  amount: number
  currency: string
  note: string
  received_by: string
  print_count: number
  plan_paid_before: number
  plan_outstanding_after: number
  company: { name: string; address: string; tpin?: string; logo?: string }
  allocations: Array<{ ref: string; label: string; due_date: string; installment_amount: number; allocated: number }>
  rights: InstallmentRights
}

export interface ReportColumn {
  key: string
  label: string
  money: boolean
}

export interface ReportData {
  title: string
  columns: ReportColumn[]
  rows: Array<Record<string, string | number | null>>
  totals: Record<string, number>
}

export interface SettingsTemplate extends PlanTemplate {
  active: boolean
  tenure: number
  used: number
}

export interface SettingsData {
  values: Record<string, string>
  templates: SettingsTemplate[]
  modes: PayMode[]
  services: Array<{ id: number; label: string }>
  accounts: PayAccount[]
  accounting: Array<{ key: string; label: string; ok: boolean; detail: string }>
  permissions: Array<{ id: number; label: string; perm: string }>
  rights: InstallmentRights
  permissions_url: string
}

export const REPORTS: Array<[key: string, label: string]> = [
  ['summary', 'Installment summary'],
  ['collection', 'Collection report'],
  ['outstanding', 'Outstanding installments'],
  ['overdue', 'Overdue installments'],
  ['statement', 'Customer statement'],
  ['performance', 'Plan performance'],
  ['monthly', 'Monthly collection'],
  ['allocation', 'Payment allocation'],
  ['aging', 'Customer aging'],
  ['ledger', 'Accounting ledger'],
]
