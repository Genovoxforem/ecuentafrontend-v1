import { useQuery } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parsePayrollSummaryRows, type PayrollSummaryRow } from './payrollSummaryReportParser'

const SUMMARY_PATH = '/payroll/payroll_summary.php?idmenu=655112376&mainmenu=payroll&leftmenu=paysumm_obj'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// The real page's "Select Month" field is actually a completed-date-range
// picker (its own placeholder says so) despite the label — confirmed live
// that a plain "DD/MM/YYYY - DD/MM/YYYY" first-day/last-day range for the
// chosen month returns exactly that month's real rows.
function monthToRange(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const first = `01/${pad(month)}/${year}`
  const last = `${pad(lastDay)}/${pad(month)}/${year}`
  return `${first} - ${last}`
}

export type PayrollSummarySearch = { type: 'employee'; employeeId: string } | { type: 'month'; month: string }

// No CSRF token field in the real form (confirmed live) — Dolibarr's
// Referer-based check here is satisfied automatically by the browser
// (same-origin fetch), same reasoning as loans.queries.ts's own comment.
export function usePayrollSummaryReport(search: PayrollSummarySearch | null) {
  return useQuery({
    queryKey: ['payroll', 'summaryReport', search],
    queryFn: async (): Promise<PayrollSummaryRow[]> => {
      if (!search) return []
      const body =
        search.type === 'employee'
          ? new URLSearchParams({ search_type: 'employee', employee_li: search.employeeId, submitt: 'Go' })
          : new URLSearchParams({ search_type: 'month', monthPic: monthToRange(search.month), submitt: 'Go' })
      const res = await fetch(SUMMARY_PATH, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parsePayrollSummaryRows(html)
    },
    enabled: !!search,
  })
}
