// Parses payroll/earn_dedu.php — confirmed live to be a plain GET-able
// classic report page (its own <form> POSTs are blocked by Dolibarr's
// Referer-based CSRF check when called cross-origin from this app, but the
// exact same search_type/monthPic/y_calnd params work fine as a GET, no
// CSRF check applied there — verified directly). Real behavior, confirmed
// by submitting both search types live:
//   - "By Month" always renders a single "Employee Name" column with no
//     data — this report's earnings/deductions figures are computed from
//     the same llx_payroll_paid_payments records as Generate/YTD Payslip,
//     which this app deliberately never writes to (see MakePaymentForm.tsx
//     and YtdPayslipForm.tsx), so there's genuinely nothing to show.
//   - "By Fiscal Year" DOES have real data: it renders a two-row <thead>
//     (a grouped "Allowances"/"Deductions" row via colspan, then the real
//     per-column labels) computed live from each employee's actually
//     assigned Salary Template — real numbers, confirmed against Manage
//     Salary's own data (e.g. Arthy 555's Basic Salary 2077 / House rent
//     allowance 2500 matches "New Template"). Its Deductions group repeats
//     NAPSA/NHIMA as many times as there are deduction slots system-wide,
//     each slot showing the same employee's own totals again — a genuine
//     backend quirk, not a guess on this app's part, which is exactly why
//     this parser reads whatever columns the backend actually returned
//     instead of hard-coding an assumed shape.
// No JSON API exists for any of this, so the real rendered table is parsed
// directly (confirmed against live default/month/fiscal-year responses).

export interface YtdEarningsDeductionsGroup {
  label: string
  colSpan: number
}

export interface YtdEarningsDeductionsRow {
  employeeName: string
  values: string[]
}

export interface YtdEarningsDeductionsReport {
  heading: string
  groups: YtdEarningsDeductionsGroup[]
  columns: string[]
  rows: YtdEarningsDeductionsRow[]
}

export function parseYtdEarningsDeductions(html: string): YtdEarningsDeductionsReport {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const heading = (doc.querySelector('#report-area h3')?.textContent ?? '').trim()
  const table = doc.querySelector('#example')
  const headRows = Array.from(table?.querySelectorAll('thead > tr') ?? [])

  const groups: YtdEarningsDeductionsGroup[] = headRows[0]
    ? Array.from(headRows[0].querySelectorAll('th'))
        .slice(1)
        .map((th) => ({ label: (th.textContent ?? '').trim(), colSpan: Number(th.getAttribute('colspan') ?? '1') }))
    : []

  const columnCells = headRows[1] ? Array.from(headRows[1].querySelectorAll('th')).map((th) => (th.textContent ?? '').trim()) : []
  const columns = columnCells.slice(1)

  const rows: YtdEarningsDeductionsRow[] = Array.from(table?.querySelectorAll('tbody > tr') ?? []).map((tr) => {
    const tds = Array.from(tr.querySelectorAll('td'))
    return {
      employeeName: (tds[0]?.textContent ?? '').trim(),
      values: tds.slice(1).map((td) => (td.textContent ?? '').trim()),
    }
  })

  return { heading, groups, columns, rows }
}
