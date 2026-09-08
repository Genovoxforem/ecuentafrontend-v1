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

// loan/list.php itself has no JSON API, but loan/loan-sidebar-list-ajax.php
// does (confirmed by reading it directly: real `header('Content-Type:
// application/json')` + `json_encode([...])`, a genuine DataTables handler
// over llx_loan with no scoping to any single loan — it queries every loan
// for the entity). Built as a side-panel widget for a single loan's own
// card, but the query itself is the same "every real loan" data this list
// page needs, live-verified against the dev backend (real, currently
// empty — no loans created on this instance yet). label/status arrive as
// small pre-rendered HTML fragments (same category as this app's other
// DataTables endpoints, e.g. tickets — not a full page, just parsed here).
// date_start/date_end/third-party are real SQL columns this endpoint
// selects but never serializes into its output, so those stay unavailable
// rather than guessed.
export interface LoanListRow {
  id: number
  label: string
  capital: string
  status: string
}
interface RawLoanListRow {
  rowid: number
  loan_details: string
  applied_amount: string
}
interface LoanListResponse {
  draw: number
  recordsTotal: number
  recordsFiltered: number
  data: RawLoanListRow[]
}
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}
export function useLoansList() {
  return useQuery({
    queryKey: ['generalLedger', 'loans'],
    queryFn: async (): Promise<LoanListRow[]> => {
      const params = new URLSearchParams({ draw: '1', start: '0', length: '200' })
      const res = await fetch(`/loan/loan-sidebar-list-ajax.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: LoanListResponse = await res.json()
      return data.data.map((r) => {
        const [capitalPart, statusPart] = r.applied_amount.split('</div>')
        return {
          id: r.rowid,
          label: stripTags(r.loan_details),
          capital: stripTags(capitalPart ?? ''),
          status: stripTags(statusPart ?? ''),
        }
      })
    },
    staleTime: 1000 * 30,
  })
}
