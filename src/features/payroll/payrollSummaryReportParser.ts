// payroll/payroll_summary.php's report table (id="example") is real,
// server-rendered HTML — confirmed live this session by logging in as
// Vox_admin and POSTing the real search form directly: a By Employee search
// for employee 11 (Sayuj) returned a genuine row (May 2026, Gross Salary
// 5500.00, Net Salary 5101.00, Paid Amount 2139.00), matching the same
// llx_payroll_paid_payments record its own row-level "Payment Details"
// popup shows. So unlike Generate Payslip/YTD Payslip/Gratuity Payment
// (whose own tables/popups were checked and found genuinely empty for every
// case tried), this report's rows are scraped for real rather than left
// inert. The row-level popup itself (a full printable payslip layout with
// company letterhead, employee profile fields, and an itemized
// allowance/deduction breakdown) is NOT reproduced — it's mostly a
// re-presentation of the same row's own numbers plus employee profile
// fields already available from Users, and its print button
// (document.body.innerHTML swap + window.print()) has no React equivalent
// worth building for what is, functionally, the same data shown twice.
export interface PayrollSummaryRow {
  employeeName: string
  month: string
  dateOfPaid: string
  grossSalary: string
  totalDeduction: string
  netSalary: string
  fineDeduction: string
  paidAmount: string
}

export function parsePayrollSummaryRows(html: string): PayrollSummaryRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rows = Array.from(doc.querySelectorAll<HTMLTableRowElement>('table#example > tbody > tr'))
  return rows
    .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim()))
    .filter((cells) => cells.length >= 8)
    .map((cells) => ({
      employeeName: cells[0],
      month: cells[1],
      dateOfPaid: cells[2],
      grossSalary: cells[3],
      totalDeduction: cells[4],
      netSalary: cells[5],
      fineDeduction: cells[6],
      paidAmount: cells[7],
    }))
}
