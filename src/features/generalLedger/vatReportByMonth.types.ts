// "TAX REPORT BY MONTH" (classic compta/tva/index.php), filled from compta/tva/fapi/report_by_month.php
// (vatReportsFapi.ts). Three tables: "Tax monthly" (Year / Tax sales / Tax purchases / Balance, one row per month
// plus Subtotal and "Total to pay"), "Tax paid" (Month / Claimed for the period / Paid during this period plus
// Total) and "Tax Balance" (label / amount pairs).

export interface VatMonthRow {
  label: string // e.g. "Apr 2026"
  month: string
  year: string
  sales: string
  purchases: string
  balance: string
}

export interface VatPaidRow {
  month: string
  claimed: string
  paid: string
}

export interface VatReportByMonth {
  title: string
  period: string
  months: VatMonthRow[]
  subtotal: { sales: string; purchases: string; balance: string } | null
  totalToPay: string
  paidRows: VatPaidRow[]
  paidTotal: { claimed: string; paid: string } | null
  balance: { label: string; value: string }[]
}
