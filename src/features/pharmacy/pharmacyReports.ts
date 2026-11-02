// The classic Pharmacy Reports page (app.php): 8 report families, 22 reports, each with its own tabs (the `view` sent to
// api.php?m=reports&action=<report key>). Copied from the app's own definitions.
export interface PharmacyReportDef {
  key: string
  label: string
  tabs: { key: string; label: string }[]
}
export interface PharmacyReportFamily {
  family: string
  reports: PharmacyReportDef[]
}

const r = (key: string, label: string, tabs: [string, string][]): PharmacyReportDef => ({ key, label, tabs: tabs.map(([k, l]) => ({ key: k, label: l })) })

export const PHARMACY_REPORT_FAMILIES: PharmacyReportFamily[] = [
  {
    family: 'Sales & Business',
    reports: [
      r('medicine_sales', 'Medicine sales detail', [['detail', 'Detailed transactions'], ['summary', 'Summary'], ['by_medicine', 'By medicine'], ['by_pharmacist', 'By pharmacist']]),
      r('daily_reconciliation', 'Daily reconciliation', [['detail', 'By day'], ['by_payment', 'By tender']]),
      r('gross_profit', 'Gross profit', [['detail', 'By line'], ['by_medicine', 'By medicine']]),
      r('receivables', 'Receivables', [['detail', 'By invoice'], ['by_customer', 'By customer']]),
    ],
  },
  {
    family: 'Prescription & Dispensing',
    reports: [
      r('dispensing_history', 'Dispensing history', [['detail', 'History'], ['by_status', 'By status']]),
      r('awaiting_collection', 'Awaiting collection', [['detail', 'Awaiting']]),
      r('partial_fills', 'Partial fills', [['detail', 'Partial fills']]),
      r('repeats_outstanding', 'Repeats outstanding', [['detail', 'Repeats']]),
    ],
  },
  {
    family: 'Controlled Register',
    reports: [r('controlled_movements', 'Controlled movements', [['detail', 'Movements'], ['by_drug', 'By drug']]), r('inspection_export', 'Inspection export', [['detail', 'Register']])],
  },
  {
    family: 'Inventory & Expiry',
    reports: [r('stock_valuation', 'Stock valuation', [['detail', 'Valuation']]), r('near_expiry', 'Near expiry', [['detail', 'Near expiry']]), r('reorder_worklist', 'Reorder worklist', [['detail', 'Reorder']])],
  },
  {
    family: 'Purchasing & Suppliers',
    reports: [r('goods_received', 'Goods received', [['detail', 'Receipts'], ['by_supplier', 'By supplier']]), r('supplier_returns', 'Supplier returns', [['detail', 'Returns']])],
  },
  {
    family: 'Fiscal & VAT',
    reports: [r('vat_summary', 'VAT summary', [['detail', 'By rate']]), r('fiscal_exceptions', 'Fiscal exceptions', [['detail', 'Exceptions']]), r('cis_reconciliation', 'CIS reconciliation', [['detail', 'Reconciliation']])],
  },
  {
    family: 'Patient & Clinical',
    reports: [r('medication_history', 'Medication history', [['detail', 'By patient']]), r('dur_overrides', 'DUR overrides', [['detail', 'Overrides']])],
  },
  {
    family: 'Audit & Privacy',
    reports: [r('clinical_access', 'Clinical access', [['detail', 'Access log']]), r('config_changes', 'Configuration changes', [['detail', 'Changes']])],
  },
]

export const PHARMACY_FISCAL_STATUSES = ['Accepted', 'Pending', 'Review']

// Answer of api.php?m=reports&action=<report>, as seen on newecuenta (self-describing: columns, KPI metrics, paging).
export interface PharmacyReportColumn {
  key: string
  label: string
  num?: boolean
  money?: boolean
  sortable?: boolean
  link?: string
  status?: boolean
}
export interface PharmacyReportAnswer {
  available: boolean
  view: string
  columns: PharmacyReportColumn[]
  rows: Record<string, unknown>[]
  totals: Record<string, number>
  metrics: { label: string; value: string }[]
  total_rows: number
  page: number
  page_size: number
  pages: number
  sort: string
  dir: 'asc' | 'desc'
  currency: string
  generated_at: string
  caps: { csv: boolean; xlsx: boolean; pdf: boolean }
  branches: (string | { id: string | number; name: string })[]
  payments: string[]
  note?: string
}

export interface PharmacyReportParams {
  view: string
  from: string
  to: string
  branch: string
  medicine: string
  payment: string
  statuses: string[]
  sort: string
  dir: 'asc' | 'desc'
  page: number
  page_size: number
}
