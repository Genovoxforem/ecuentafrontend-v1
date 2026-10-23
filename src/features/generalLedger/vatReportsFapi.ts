import { fapiGet } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { VatByCustomerPage, VatCustomerGroup, VatCustomerLine } from './vatByCustomerParser'
import type { VatMonthRow, VatReportByMonth } from './vatReportByMonthParser'
import type { VatByRatePage, VatRateDetail } from './vatReportByRateParser'

// The three VAT reports on compta/tva/fapi (22 Oct 2026), in the shapes the report pages already render. The answers were captured from
// newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-vat-*.json). The vendor ("paid") side is empty there, so its line shape is the
// customer one by assumption and has not been seen with live rows.

const usDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}

// ---- By month: report_by_month.php -------------------------------------------------------------------------------------------------

export interface FapiVatByMonth {
  period: { start: string; end: string }
  months: Array<{ label: string; month: number; year: number; sales: number; purchases: number; balance: number }>
  total_to_pay: number
  paid_rows: Array<{ label?: string; month?: string; claimed: number; paid: number }>
  paid_total: { claimed: number; paid: number }
  tax_balance?: { vat_due: number; vat_paid: number; remain_to_pay: number }
}

export function mapVatByMonth(d: FapiVatByMonth): VatReportByMonth {
  const sum = (k: 'sales' | 'purchases' | 'balance') => d.months.reduce((t, m) => t + m[k], 0)
  const months: VatMonthRow[] = d.months.map((m) => ({ label: m.label, month: String(m.month), year: String(m.year), sales: formatMoney(m.sales), purchases: formatMoney(m.purchases), balance: formatMoney(m.balance) }))
  return {
    title: 'TAX REPORT BY MONTH',
    period: `${d.period.start} - ${d.period.end}`,
    months,
    subtotal: { sales: formatMoney(sum('sales')), purchases: formatMoney(sum('purchases')), balance: formatMoney(sum('balance')) },
    totalToPay: formatMoney(d.total_to_pay),
    paidRows: d.paid_rows.map((r) => ({ month: r.label ?? r.month ?? '', claimed: formatMoney(r.claimed), paid: formatMoney(r.paid) })),
    paidTotal: d.paid_rows.length ? { claimed: formatMoney(d.paid_total.claimed), paid: formatMoney(d.paid_total.paid) } : null,
    balance: d.tax_balance
      ? [
          { label: 'Sale tax claimed', value: formatMoney(d.tax_balance.vat_due) },
          { label: 'Sale tax paid', value: formatMoney(d.tax_balance.vat_paid) },
          { label: 'Remaining to pay', value: formatMoney(d.tax_balance.remain_to_pay) },
        ]
      : [],
  }
}

export const loadVatByMonth = async () => mapVatByMonth(await fapiGet<FapiVatByMonth>('/compta/tva/fapi/report_by_month.php'))

// ---- By customer: report_by_customer.php -----------------------------------------------------------------------------------------

interface FapiVatLine {
  invoice_id: number
  invoice_ref: string
  date: string | null
  date_payment: string | null
  rate: string
  product_id: number | null
  product_ref: string | null
  description: string | null
  amount_ht: number
  payment_amount: number
  net: number
  vat: number
}
interface FapiVatGroup {
  thirdparty_id: number
  thirdparty_name: string
  total_net: number
  total_vat: number
  lines: FapiVatLine[]
}
export interface FapiVatByCustomer {
  period: { start: string; end: string }
  min: number
  received: FapiVatGroup[]
  paid: FapiVatGroup[]
  total_to_pay: number
}

const HEADERS = ['Date', 'Payment date', 'Rate', 'Description', 'Amount', 'Payment', 'Net', 'Tax']

// The hrefs are the keys the app's route resolver maps to its own pages; they are never shown or opened.
const mapGroup = (g: FapiVatGroup, vendor: boolean): VatCustomerGroup => ({
  party: { text: g.thirdparty_name, href: `/societe/card.php?socid=${g.thirdparty_id}` },
  note: '',
  lines: g.lines.map(
    (l): VatCustomerLine => ({
      ref: { text: l.invoice_ref, href: `${vendor ? '/fourn/facture/card.php' : '/compta/facture/card.php'}?facid=${l.invoice_id}` },
      date: l.date ?? '',
      datePayment: l.date_payment ?? '',
      rateOrParty: { text: l.rate, href: null },
      productRef: l.product_ref ?? '',
      productHref: l.product_id ? `/product/card.php?id=${l.product_id}` : null,
      description: l.description ?? '',
      amount: formatMoney(l.amount_ht),
      payment: formatMoney(l.payment_amount),
      net: formatMoney(l.net),
      tax: formatMoney(l.vat),
    }),
  ),
  totalNet: formatMoney(g.total_net),
  totalTax: formatMoney(g.total_vat),
})

export function mapVatByCustomer(d: FapiVatByCustomer): VatByCustomerPage {
  return {
    dateStart: d.period.start,
    dateEnd: d.period.end,
    min: d.min ? String(d.min) : '',
    sections: [
      { headers: ['Customer invoices', ...HEADERS], groups: d.received.map((g) => mapGroup(g, false)) },
      { headers: ['Vendor invoices', ...HEADERS], groups: d.paid.map((g) => mapGroup(g, true)) },
    ],
    totalToPay: formatMoney(d.total_to_pay),
  }
}

export const loadVatByCustomer = async (f: { dateStart: string; dateEnd: string; min: string }) => {
  const range = f.dateStart && f.dateEnd
  return mapVatByCustomer(await fapiGet<FapiVatByCustomer>('/compta/tva/fapi/report_by_customer.php', { date_start: range ? f.dateStart : undefined, date_end: range ? f.dateEnd : undefined, min: f.min.trim() || undefined }))
}

// ---- By rate: report_by_rate.php (summary, and detail=1 for one rate's invoice lines) ------------------------------------------------

export interface FapiVatByRate {
  period: { start: string; end: string }
  invoice_type: string
  status_val: string
  rows: Array<{ rate: number; code: string; excl: number; vat: number; incl: number }>
  totals: { excl: number; vat: number; incl: number }
}

export function mapVatByRate(d: FapiVatByRate): VatByRatePage {
  return {
    title: 'Sale tax report by rates',
    period: `${usDate(d.period.start)}-${usDate(d.period.end)}`,
    invoiceType: d.invoice_type,
    invoiceTypeOptions: [
      { value: 'customer', label: 'Customer invoices' },
      { value: 'vendor', label: 'Vendor invoices' },
    ],
    status: d.status_val || 'All',
    statusOptions: [
      { value: 'All', label: 'All' },
      { value: 'Succeed', label: 'Succeed' },
      { value: 'Failed', label: 'Failed' },
    ],
    rows: d.rows.map((r) => ({ rate: `${r.rate}%`, code: r.code, excl: formatMoney(r.excl), vat: formatMoney(r.vat), incl: formatMoney(r.incl), detailId: r.code })),
    totals: { excl: formatMoney(d.totals.excl), vat: formatMoney(d.totals.vat), incl: formatMoney(d.totals.incl) },
  }
}

interface RateFilters {
  period: string
  invoiceType: string
  status: string
}

const rateParams = (f: RateFilters) => ({ period: f.period || undefined, invoice_type: f.invoiceType || undefined, status_val: f.status === 'All' ? undefined : f.status })

export const loadVatByRate = async (f: RateFilters) => mapVatByRate(await fapiGet<FapiVatByRate>('/compta/tva/fapi/report_by_rate.php', rateParams(f)))

export interface FapiVatRateDetail {
  period: { start: string; end: string }
  vat_src_code: string
  localtax1_type: string
  rows: Array<{ ref: string; receipt_no: string; customer: string; customer_id: number; date: string; product: string; product_ref: string; excl: number; vat: number; incl: number }>
  totals: { excl: number; vat: number; incl: number }
}

export function mapVatRateDetail(d: FapiVatRateDetail): VatRateDetail {
  return {
    period: `${usDate(d.period.start)} - ${usDate(d.period.end)}`,
    rateLabel: `${d.vat_src_code},${d.localtax1_type}`,
    rows: d.rows.map((r) => ({
      ref: r.ref, receiptNo: r.receipt_no, customer: r.customer, customerId: String(r.customer_id), date: r.date, product: r.product, productRef: r.product_ref,
      excl: formatMoney(r.excl), vat: formatMoney(r.vat), incl: formatMoney(r.incl),
    })),
    totals: { excl: formatMoney(d.totals.excl), vat: formatMoney(d.totals.vat), incl: formatMoney(d.totals.incl) },
  }
}

export const loadVatRateDetail = async (detailId: string, f: RateFilters) =>
  mapVatRateDetail(await fapiGet<FapiVatRateDetail>('/compta/tva/fapi/report_by_rate.php', { detail: 1, invoiceno: detailId, ...rateParams(f) }))
