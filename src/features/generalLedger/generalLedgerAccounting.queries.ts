import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// The per-type invoice drill-down of accountancy/closure/financiallist.php. It runs on
// accountancy/fapi/financial_closure.php?action=detail&year=&type= (key-authenticated JSON; the classic financial_invoice_api.php is no longer read).
// Compared row by row, GET only, with the classic call for the same year:
//   newecuenta 2026: sales 91 = 91, bank 37 = 37, purchase 0 = 0, expense 0 = 0;
//   172.16.5.10 2026: sales 2709, purchase 250, expense 22, bank 3009 - same refs and same fields in every list.
// The API adds date_rfc and *_num fields next to the classic ones; the dates print in the instance's own format on both.
export type InvoiceDrillType = 'sales' | 'purchase' | 'expense' | 'bank'

export interface InvoiceDrillRow {
  ref: string
  third_party?: string
  account_number?: string
  label?: string
  date: string
  amount_ht?: string
  amount_ttc?: string
  status?: string
  debit?: string
  credit?: string
}

export function useInvoiceDrilldown(type: InvoiceDrillType, year: number, enabled: boolean) {
  return useQuery({
    queryKey: ['generalLedger', 'financialClosureDrilldown', type, year],
    queryFn: async (): Promise<InvoiceDrillRow[]> => (await fapiGet<{ data?: InvoiceDrillRow[] }>('/accountancy/fapi/financial_closure.php', { action: 'detail', year, type })).data ?? [],
    enabled,
    staleTime: 1000 * 30,
  })
}
