// "SALE TAX REPORT BY RATES" (classic compta/tva/quadri_detail.php), filled from compta/tva/fapi/report_by_rate.php
// (vatReportsFapi.ts): one row per VAT rate/code, filtered by period, invoice type (customer|vendor) and status.
// Each row's "+" opens the invoice lines behind that rate.

export interface VatRateRow {
  rate: string
  code: string
  excl: string
  vat: string
  incl: string
  detailId: string
}

export interface VatByRatePage {
  title: string
  period: string // "MM/dd/yyyy-MM/dd/yyyy"
  invoiceType: string
  invoiceTypeOptions: { value: string; label: string }[]
  status: string
  statusOptions: { value: string; label: string }[]
  rows: VatRateRow[]
  totals: { excl: string; vat: string; incl: string } | null
}

export interface VatRateDetailRow {
  ref: string
  receiptNo: string
  customer: string
  customerId: string
  date: string
  product: string
  productRef: string
  excl: string
  vat: string
  incl: string
}

export interface VatRateDetail {
  period: string
  rateLabel: string
  rows: VatRateDetailRow[]
  totals: { excl: string; vat: string; incl: string } | null
}
