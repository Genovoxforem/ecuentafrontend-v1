import { useQuery } from '@tanstack/react-query'

// The 2 real JSON APIs wired in this pass, out of a much larger real
// backend (expense/ — see expensesPlaceholders.ts's header comment for the
// full module audit summary). expense/ajax/expense_list.php is the
// best-built file in the whole module: real permission check
// (hasRight('expensereport','lire')), real child-user scoping, real
// filters/sort/pagination. expense/api/expense_types.php is a simple real
// dropdown feed.
//
// Important: this whole "Expenses" SPA (expense/list.php and its 11 real
// sibling pages) is reachable today only by typing a direct URL — every
// page's own tab-bar include is commented out in the live PHP, so a real
// user has never actually seen its navigation rendered. That means most of
// this module's other real APIs (create/submit/approve/pay/advance/
// reimburse/repay/recurring — all confirmed real, all in expense/api/
// expense.php and expense/api/lines.php) have no reference UI to redesign
// against; see expensesPlaceholders.ts for how those are represented
// honestly instead of invented from scratch.

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export interface ExpenseReportRow {
  id: number
  ref: string
  linkedTo: string
  user: string
  dateStart: string
  dateEnd: string
  dateCreate: string
  totalHt: string
  totalTva: string
  totalTtc: string
  status: string
  paid: boolean
  notes: string
}
interface RawExpenseListResponse {
  draw: number
  recordsTotal: number
  recordsFiltered: number
  aaData: Array<{
    ref: string
    rowid: number
    linked_to: string
    user: string
    date_debut: string
    date_fin: string
    date_create: string
    total_ht: string
    total_tva: string
    total_ttc: string
    status: string
    paid: string
    notes: string
  }>
  error?: string
}

export interface ExpenseListFilters {
  status: string
  dateFrom: string
  dateTo: string
}

export function useExpenseReportsList(filters: ExpenseListFilters, page: number, length: number) {
  return useQuery({
    queryKey: ['expenses', 'list', filters, page, length],
    queryFn: async (): Promise<{ rows: ExpenseReportRow[]; total: number; filtered: number }> => {
      const body = new URLSearchParams({ draw: '1', start: String(page * length), length: String(length) })
      if (filters.status) body.set('filter_status', filters.status)
      if (filters.dateFrom) body.set('filter_date_from', filters.dateFrom)
      if (filters.dateTo) body.set('filter_date_to', filters.dateTo)
      const res = await fetch('/expense/ajax/expense_list.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawExpenseListResponse = await res.json()
      if (data.error) throw new Error(data.error)
      return {
        rows: data.aaData.map((r) => ({
          id: r.rowid,
          ref: stripTags(r.ref),
          linkedTo: stripTags(r.linked_to),
          user: stripTags(r.user),
          dateStart: r.date_debut,
          dateEnd: r.date_fin,
          dateCreate: r.date_create,
          totalHt: r.total_ht,
          totalTva: r.total_tva,
          totalTtc: r.total_ttc,
          status: stripTags(r.status),
          paid: stripTags(r.paid).toLowerCase() === 'paid',
          notes: r.notes,
        })),
        total: data.recordsTotal,
        filtered: data.recordsFiltered,
      }
    },
  })
}

export interface ExpenseTypeOption {
  id: number
  label: string
}
interface RawExpenseTypesResponse {
  success: boolean
  results: Array<{ id: number; text: string }>
}
export function useExpenseTypes() {
  return useQuery({
    queryKey: ['expenses', 'types'],
    queryFn: async (): Promise<ExpenseTypeOption[]> => {
      const res = await fetch('/expense/api/expense_types.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawExpenseTypesResponse = await res.json()
      if (!data.success) throw new Error('Legacy backend rejected the request.')
      return data.results.map((r) => ({ id: r.id, label: r.text }))
    },
    staleTime: 1000 * 60 * 10,
  })
}
