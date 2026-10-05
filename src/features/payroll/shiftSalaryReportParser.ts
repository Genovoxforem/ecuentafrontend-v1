// Parses payroll/special_shift_salary_report.php?shift=manual|holidayshift —
// one real backend file powering both "Special Shift Salary Report" and
// "Holiday Shift Salary Report" (confirmed by reading the PHP directly:
// `$shift_Type = GETPOST('shift')` just switches a couple of labels and the
// llx_payroll_manual_shifts.shift_id filter). Plain GET-able classic report
// (`isset($_REQUEST['submitt'])`). Real filters: Month (`monthPic`, matched
// with exact string equality against the stored `month` column — this
// backend has zero rows in that table right now so the real stored format
// couldn't be confirmed live; sent as this app's own established
// "Month Year" text, the same convention proved on 3 other real Payroll
// report pages — see MonthYearPicker.tsx), Entity (`TypesOfEntity`, "All
// Entity" + one option per real llx_entity row), Employee (`employee_li`,
// grouped by entity, each option's value a real composite "userId--entityId"
// string, not a plain user id). Real columns: Month/Employee Name/
// Designation/Amount-Percentage Method/Amount (Per day)/Salaried Amount —
// the real 7th column, Action, is a bare <a> straight to
// payroll/shiftsmanual_amount.php (a legacy page with no React route), so
// it's read here but deliberately not rendered as a link.

export interface ShiftSalaryEntityOption {
  value: string
  label: string
}
export function parseShiftSalaryEntities(doc: Document): ShiftSalaryEntityOption[] {
  const select = doc.querySelector('#TypesOfEntity')
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ value: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
    .filter((o) => o.value)
}

export interface ShiftSalaryEmployeeOption {
  value: string
  label: string
  group: string
}
export function parseShiftSalaryEmployees(doc: Document): ShiftSalaryEmployeeOption[] {
  const select = doc.querySelector('#employee_li')
  if (!select) return []
  const options: ShiftSalaryEmployeeOption[] = []
  select.querySelectorAll('optgroup').forEach((group) => {
    const groupLabel = group.getAttribute('label') ?? ''
    group.querySelectorAll('option').forEach((o) => {
      const value = o.getAttribute('value') ?? ''
      if (!value) return
      options.push({ value, label: (o.textContent ?? '').trim(), group: groupLabel })
    })
  })
  return options
}

export interface ShiftSalaryRow {
  month: string
  employeeName: string
  designation: string
  method: string
  amountPerDay: string
  salariedAmount: string
}

export function parseShiftSalaryReport(html: string): ShiftSalaryRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('table#example')
  const rows: ShiftSalaryRow[] = []
  table?.querySelectorAll('tbody > tr').forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    if (tds.length < 6) return
    rows.push({
      month: (tds[0]?.textContent ?? '').trim(),
      employeeName: (tds[1]?.textContent ?? '').trim(),
      designation: (tds[2]?.textContent ?? '').trim(),
      method: (tds[3]?.textContent ?? '').trim(),
      amountPerDay: (tds[4]?.textContent ?? '').trim(),
      salariedAmount: (tds[5]?.textContent ?? '').trim(),
    })
  })
  return rows
}
