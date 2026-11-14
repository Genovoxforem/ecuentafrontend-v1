import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deletePayment, fetchPaymentStats, fetchPayments, type PaymentApiInvoice, type PaymentApiRow, type PaymentStatsData } from '../../api/payments'

export interface PaymentRow {
  id: number
  invoices: PaymentApiInvoice[]
  ref: string
  paymentReference: string | null
  // The payment's own number (num_payment: the cheque / transfer number); the classic payment card prints it as "Number" (live PAY2611-0076: PW-1980).
  numPayment: string | null
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
    invoices: row.invoices,
    ref: row.ref,
    numPayment: row.num_payment || null,
    paymentReference: row.invoices.map((invoice) => invoice.ref).filter(Boolean).join(', ') || row.num_payment || null,
    customerName: row.thirdparty?.name ?? null,
    socid: row.thirdparty?.id ?? null,
    paymentDate: normalizeDate(row.date),
    paymentTypeLabel: row.type_label || row.type_code || null,
    amount: row.amount,
    bankEntryId: row.bank_entry_id ?? null,
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

// compta/paiement/fapi has a list only (no card endpoint): the card is the list row with that ref, found with the list's
// search_ref filter (a LIKE match, so the exact ref is among the rows). The filter answered 500 until BUG-96 was fixed
// (5 Nov 2026); on a backend that still fails it the pages are read unfiltered until the ref is found.
async function findPaymentByScan(ref: string): Promise<PaymentRow | null> {
  for (let page = 1; ; page += 1) {
    const result = await fetchPayments({ page, limit: 100 })
    const match = result.items.find((item) => item.ref === ref)
    if (match) return toPaymentRow(match)
    if (page >= result.pagination.pages) return null
  }
}

export function usePayment(ref: string) {
  return useQuery<PaymentRow | null>({
    queryKey: ['payments', 'card', ref],
    queryFn: async () => {
      let found: Awaited<ReturnType<typeof fetchPayments>>
      try {
        found = await fetchPayments({ search_ref: ref, limit: 100 })
      } catch {
        return findPaymentByScan(ref)
      }
      const match = found.items.find((item) => item.ref === ref)
      return match ? toPaymentRow(match) : null
    },
    enabled: !!ref,
  })
}

export function usePaymentStats(period: PaymentsPeriod) {
  return useQuery<PaymentStatsData>({
    queryKey: ['payments', 'stats', period.from, period.to],
    queryFn: () => fetchPaymentStats({ date_start: period.from, date_end: period.to }),
    placeholderData: (prev) => prev,
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
