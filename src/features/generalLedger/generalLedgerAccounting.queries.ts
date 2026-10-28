import { useQuery } from '@tanstack/react-query'

// accountancy/closure/financiallist.php's own year summary (creation
// details, chart-of-accounts debit/credit table) is server-rendered HTML
// with no JSON API — not reproduced here (see FinancialClosureListPage.tsx's
// own banner). Its per-type invoice drill-down IS real JSON though —
// financial_invoice_api.php, confirmed by reading it directly: always
// `header('Content-Type: application/json')` + `echo json_encode([...])`,
// real queries against facture/facture_fourn/expensereport/bank.
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

interface InvoiceDrillResponse {
  success: boolean
  message: string
  data: InvoiceDrillRow[]
}

export function useInvoiceDrilldown(type: InvoiceDrillType, year: number, enabled: boolean) {
  return useQuery({
    queryKey: ['generalLedger', 'financialClosureDrilldown', type, year],
    queryFn: async (): Promise<InvoiceDrillRow[]> => {
      const params = new URLSearchParams({ action: 'get_invoices', type, year: String(year) })
      const res = await fetch(`/accountancy/closure/financial_invoice_api.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: InvoiceDrillResponse = await res.json()
      if (!data.success) throw new Error(data.message || 'The backend rejected this request.')
      return data.data
    },
    enabled,
    staleTime: 1000 * 30,
  })
}
