import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { parseQuotationListRow, parseUsDate, type QuotationListRow, type RawQuotationListRow } from './quotationListParser'

export interface QuotationRow {
  id: number | null
  ref: string
  refCustomer: string
  projectRef: string
  thirdParty: string
  socid: number | null
  city: string
  zipCode: string
  date: string
  endDate: string
  amountExclTax: number
  author: string
  salesRep: string
  status: string
  isLate: boolean
  documentUrl: string | null
}

export interface QuotationsSummary {
  totalProposals: number
  proposalsThisMonth: number
  totalProposalAmount: number
  validatedCount: number
  draftCount: number
  quotations: QuotationRow[]
}

function toRow(r: QuotationListRow): QuotationRow {
  return {
    id: r.id,
    ref: r.ref,
    refCustomer: r.refCustomer,
    projectRef: r.projectRef,
    thirdParty: r.thirdPartyName,
    socid: r.socid,
    city: r.city,
    zipCode: r.zipCode,
    date: r.date,
    endDate: r.endDate,
    amountExclTax: r.amountExclTax,
    author: r.author,
    salesRep: r.salesRep,
    status: r.statusLabel,
    isLate: r.isLate,
    documentUrl: r.documentUrl,
  }
}

// POST comm/propal/quotation_ajax_list.php (length=-1 in the body) — a
// real, working DataTables JSON endpoint (confirmed by reading its PHP
// source directly), unrelated to the old dead local-only collection this
// replaces (no REST route for quotations/proposals ever existed under
// /api/*). Same "length=-1 fetches everything, compute stats client-side"
// convention as Purchase Orders' own list (see purchaseOrders.queries.ts).
//
// Must be a POST, not a GET with query params: the real PHP reads
// `$_POST['length']` directly (not GETPOST(), which would accept either) —
// confirmed live by comparing the two live: a GET with `?length=-1` still
// falls through to the hardcoded default of 10 rows since $_POST is empty
// for a GET request, silently truncating this list (and every stat card
// computed from it) to 10 records even when more exist. The DataTables
// convention this page's own JS follows is a POST in the first place
// ('serverMethod': 'post', read directly from list.php), so this matches
// the real contract rather than working around it.
//
// The 4 real stat cards on comm/propal/list.php are each their own raw SQL
// query (COUNT(*), COUNT(*) this month, SUM(total_ht), and a COUNT(*) GROUP
// BY fk_statut for statuses 1 and 0) — read directly from list.php, and
// recomputed client-side here the same way. Unlike Purchase Orders' own
// stat-card quirk, this one is internally consistent: status 1 genuinely is
// Propal::STATUS_VALIDATED ("Validated") and status 0 genuinely is
// STATUS_DRAFT ("Draft") — no relabeling mismatch to preserve here.
export function useQuotationsSummary() {
  return useQuery({
    queryKey: ['quotations', 'list'],
    queryFn: async (): Promise<QuotationsSummary> => {
      const body = new URLSearchParams({ draw: '1', start: '0', length: '-1' })
      const { data } = await axios.post<{ aaData: RawQuotationListRow[] }>('/comm/propal/quotation_ajax_list.php', body)
      const rows = (data.aaData ?? []).map(parseQuotationListRow)
      const now = new Date()
      const proposalsThisMonth = rows.filter((r) => {
        const d = parseUsDate(r.date)
        return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }).length
      return {
        totalProposals: rows.length,
        proposalsThisMonth,
        totalProposalAmount: rows.reduce((sum, r) => sum + r.amountExclTax, 0),
        validatedCount: rows.filter((r) => r.statusCode === 1).length,
        draftCount: rows.filter((r) => r.statusCode === 0).length,
        quotations: rows.map(toRow),
      }
    },
    staleTime: 1000 * 30,
  })
}
