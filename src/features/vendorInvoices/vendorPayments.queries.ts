/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

export interface PurchasePaymentRow {
  id: number
  ref: string
  paymentReference: string | null
  thirdPartyName: string | null
  paymentDate: string
  paymentTypeLabel: string | null
  accountLabel: string | null
  amount: number
  statusCode: number
  statusLabel: 'Validated' | 'Draft'
}

const BASE = '/fourn/facture/fapi'

function rowFromFapi(p: any): PurchasePaymentRow {
  return {
    id: Number(p.id) || 0,
    ref: p.ref ?? '',
    paymentReference: p.number ?? p.num_payment ?? p.payment_number ?? null,
    thirdPartyName: p.supplier?.name ?? p.supplier_name ?? null,
    paymentDate: String(p.date ?? p.date_payment ?? p.datep ?? ''),
    paymentTypeLabel: p.payment_mode_label ?? p.payment_mode ?? p.type_label ?? null,
    accountLabel: p.bank_account?.label ?? p.bank_account_label ?? (typeof p.bank_account === 'string' ? p.bank_account : null),
    amount: Number(p.amount) || 0,
    statusCode: Number(p.status ?? 1),
    statusLabel: Number(p.status ?? 1) === 0 ? 'Draft' : 'Validated',
  }
}

// fourn/facture/fapi/payments_list.php: one row per payment (with the invoices it is allocated to), searchable
// and filterable by date, vendor, mode and bank. The legacy join repeated a payment once per invoice it covered,
// which overstated every total.
export function usePurchasePayments(search = '') {
  return useQuery({
    queryKey: ['purchase-payments', search],
    queryFn: async (): Promise<{ items: PurchasePaymentRow[]; total: number }> => {
      const items: any[] = []
      let pages = 1
      for (let page = 1; page <= pages && page <= 50; page += 1) {
        const d = await fapiGet<any>(`${BASE}/payments_list.php`, { page, limit: 100, search: search || undefined, sort: 'date', direction: 'desc' })
        pages = d.pages ?? 1
        items.push(...(d.items ?? []))
      }
      return { items: items.map(rowFromFapi), total: items.length }
    },
  })
}

export interface PurchasePaymentsReport {
  rows: PurchasePaymentRow[]
  grandTotal: number
  byMode: { label: string; total: number; count: number }[]
  currency: string
}

// payments_report.php?year=&month=: the rows of the period and the totals by payment mode, bank account and vendor.
export function usePurchasePaymentsReport(year: number, month: number) {
  return useQuery({
    queryKey: ['purchase-payments', 'report', year, month],
    queryFn: async (): Promise<PurchasePaymentsReport> => {
      const d = await fapiGet<any>(`${BASE}/payments_report.php`, { year, month: month + 1 })
      return {
        rows: (d.rows ?? []).map(rowFromFapi),
        grandTotal: Number(d.totals?.grand_total) || 0,
        byMode: (d.totals?.by_mode ?? []).map((m: any) => ({ label: m.label ?? m.mode ?? '', total: Number(m.total ?? m.amount) || 0, count: Number(m.count) || 0 })),
        currency: d.totals?.currency ?? '',
      }
    },
  })
}

// POST payments_report.php?action=export_csv: writes the period's figures to a file (there is no monthly PDF; a
// single payment's PDF is build_pdf with a payment_id).
export async function exportPurchasePaymentsReport(year: number, month: number): Promise<{ url?: string; file?: string }> {
  return fapiPost<{ url?: string; file?: string }>(`${BASE}/payments_report.php`, { year, month: month + 1 }, { action: 'export_csv' })
}
