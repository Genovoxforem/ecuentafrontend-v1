import { useQuery } from '@tanstack/react-query'
import { fetchPaymentStats, fetchPayments, type PaymentApiRow, type PaymentStatsData } from '../../api/payments'

export interface PaymentRow {
  id: number
  ref: string
  paymentReference: string | null
  customerName: string | null
  socid: number | null
  paymentDate: string
  paymentTypeLabel: string | null
  amount: number
  bankEntryId: number | null
  accountId: number | null
  accountName: string | null
}

export interface PaymentsPeriod {
  from: string // yyyy-MM-dd
  to: string // yyyy-MM-dd
}

function normalizeDate(date: string): string {
  const usDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date)
  if (usDate) return `${usDate[3]}-${usDate[1]}-${usDate[2]}`
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  return isoDate ? `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}` : date
}

function toPaymentRow(row: PaymentApiRow): PaymentRow {
  return {
    id: row.id,
    ref: row.ref,
    paymentReference: row.invoices.map((invoice) => invoice.ref).filter(Boolean).join(', ') || row.num_payment || null,
    customerName: row.thirdparty?.name ?? null,
    socid: row.thirdparty?.id ?? null,
    paymentDate: normalizeDate(row.date),
    paymentTypeLabel: row.type_label || row.type_code || null,
    amount: row.amount,
    bankEntryId: null,
    accountId: row.bank_account?.id ?? null,
    accountName: row.bank_account?.label ?? null,
  }
}

async function fetchAllPayments(period: PaymentsPeriod): Promise<PaymentRow[]> {
  const firstPage = await fetchPayments({ date_start: period.from, date_end: period.to, page: 1, limit: 100 })
  const items = [...firstPage.items]
  for (let page = 2; page <= firstPage.pagination.pages; page += 5) {
    const pages = await Promise.all(
      Array.from({ length: Math.min(5, firstPage.pagination.pages - page + 1) }, (_, index) =>
        fetchPayments({ date_start: period.from, date_end: period.to, page: page + index, limit: 100 }),
      ),
    )
    items.push(...pages.flatMap((result) => result.items))
  }
  return items.map(toPaymentRow)
}

export function usePayments(period: PaymentsPeriod) {
  return useQuery({
    queryKey: ['payments', period.from, period.to],
    queryFn: async (): Promise<{ items: PaymentRow[]; total: number }> => {
      const items = await fetchAllPayments(period)
      return { items, total: items.length }
    },
    placeholderData: (prev) => prev,
  })
}

export function usePaymentStats(period: PaymentsPeriod) {
  return useQuery<PaymentStatsData>({
    queryKey: ['payments', 'stats', period.from, period.to],
    queryFn: () => fetchPaymentStats({ date_start: period.from, date_end: period.to }),
    placeholderData: (prev) => prev,
  })
}
