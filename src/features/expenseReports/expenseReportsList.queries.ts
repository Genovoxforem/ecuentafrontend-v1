import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { dmy } from '../expenses/expenseFapi'
import { formatMoney } from '../../utils/format'

// expensereport/list.php — Dolibarr's CLASSIC expense-report list module, a different backend module from the custom expense/ SPA that the
// Expenses feature covers (both query llx_expensereport). The rows come from expensereport/fapi/list.php (26 Oct 2026), which replaces the
// DataTables endpoint expensereport/expensereport_ajax_list.php: that one ignored the search text and a GET, and its per-status counts had to
// be fetched with one request per status. The fapi list takes the status, a search text, a user, a date range, the sort and the page.
//
// The stat cards show counts only: the amounts the classic page prints under each card are not in a row answer, and no endpoint gives them.
// newecuenta holds no expense report, so the item shape is the document's own ("from code") and has not been seen with a live row.

export interface ExpenseReportRow {
  id: number
  ref: string
  refUrl: string
  linkedTo: string
  linkedToUrl: string
  user: string
  userUrl: string
  dateStart: string
  dateEnd: string
  dateCreate: string
  totalHt: string
  totalTva: string
  totalTtc: string
  status: string
  notes: string
}

export interface FapiClassicExpenseItem {
  id: number
  ref: string
  user: { fullname: string }
  status_label: string
  date_debut: string
  date_fin: string
  date_create: string
  total_ht: number
  total_tva: number
  total_ttc: number
  note_public: string | null
  linked_to: unknown
}

const linkedName = (l: unknown) => (typeof l === 'string' ? l : l && typeof l === 'object' && typeof (l as { name?: unknown }).name === 'string' ? (l as { name: string }).name : '')

export const mapClassicExpenseItem = (r: FapiClassicExpenseItem): ExpenseReportRow => ({
  id: r.id,
  ref: r.ref,
  refUrl: '',
  linkedTo: linkedName(r.linked_to),
  linkedToUrl: '',
  user: r.user.fullname,
  userUrl: '',
  dateStart: dmy(r.date_debut),
  dateEnd: dmy(r.date_fin),
  dateCreate: dmy(r.date_create),
  totalHt: formatMoney(r.total_ht),
  totalTva: formatMoney(r.total_tva),
  totalTtc: formatMoney(r.total_ttc),
  status: r.status_label,
  notes: r.note_public ?? '',
})

async function fetchExpenseReportPage(status: string, page: number, length: number): Promise<{ rows: ExpenseReportRow[]; total: number; filtered: number }> {
  const d = await fapiGet<{ items: FapiClassicExpenseItem[]; pagination: { total: number } }>('/expensereport/fapi/list.php', { page: page + 1, limit: length, status: status && status !== '-1' ? status : undefined })
  // the endpoint counts the rows of the chosen status only
  return { rows: d.items.map(mapClassicExpenseItem), total: d.pagination.total, filtered: d.pagination.total }
}

export interface ExpenseReportListFilters {
  status: string
  search: string
}

export function useExpenseReportListPage(filters: ExpenseReportListFilters, page: number, length: number) {
  return useQuery({
    queryKey: ['expenseReports', 'list', filters.status, page, length],
    queryFn: () => fetchExpenseReportPage(filters.status, page, length),
    placeholderData: (prev) => prev,
  })
}

// Status codes of the classic module: 0=Draft, 2=Validated, 5=Approved, 6=Paid, 4=Canceled, 99=Refused.
export const EXPENSE_REPORT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: '0', label: 'Draft' },
  { value: '2', label: 'Validated' },
  { value: '5', label: 'Approved' },
  { value: '6', label: 'Paid' },
  { value: '4', label: 'Canceled' },
  { value: '99', label: 'Refused' },
]

export interface ExpenseReportStatusCounts {
  total: number
  approved: number
  unapproved: number
  paid: number
  unpaid: number
  validated: number
}

// One light request (limit 1: only the count is read) per status bucket, in parallel. Unapproved / Unpaid are worked out from the other
// counts (Total − Approved − Paid, and Total − Paid).
export function useExpenseReportStatusCounts() {
  return useQuery({
    queryKey: ['expenseReports', 'statusCounts'],
    queryFn: async (): Promise<ExpenseReportStatusCounts> => {
      const [all, approved, paid, validated] = await Promise.all([fetchExpenseReportPage('-1', 0, 1), fetchExpenseReportPage('5', 0, 1), fetchExpenseReportPage('6', 0, 1), fetchExpenseReportPage('2', 0, 1)])
      const total = all.filtered
      return {
        total,
        approved: approved.filtered,
        unapproved: Math.max(0, total - approved.filtered - paid.filtered),
        paid: paid.filtered,
        unpaid: Math.max(0, total - paid.filtered),
        validated: validated.filtered,
      }
    },
    staleTime: 1000 * 30,
  })
}
