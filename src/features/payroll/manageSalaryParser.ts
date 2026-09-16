// Parses payroll/ajax_search.php?entityEmp=<entityId> — the real backend
// fragment behind payroll/manage_salary.php's own "Go" button (POST,
// confirmed live: client does `$("#ajaxContents").html(msg)`). Each row
// carries the current Assigned Salary Grade / Assigned Shift display text
// (either literal "Not Set" in red, or e.g. "New Template (Monthly)" /
// "Voxforem shift (15-09-2026)") plus a full per-employee "Assign Details"
// modal already server-rendered, real option lists and pre-selected values
// included — nothing here is guessed, every field below maps 1:1 to an id
// in that modal's real markup (confirmed by reading several employees live,
// both unassigned and already-assigned).
//
// One markup quirk to know: the Hourly/Monthly Grade <select>s always carry
// a literal `selected` attribute on their disabled placeholder option *in
// addition to* the real selected option when one exists (both attributes
// present in the raw HTML at once) — an attribute-selector query would find
// the placeholder first and misreport "nothing selected". Reading
// `select.selectedOptions[0]` instead is correct here: per the HTML parsing
// spec, a non-multiple <select> keeps selectedness only on the *last*
// option that had the `selected` attribute, which resolves this correctly
// whether or not jsdom/the browser is doing the parsing.

export interface ManageSalaryOption {
  value: string
  label: string
}

export interface ManageSalaryRow {
  employeeId: number
  employeeName: string
  designation: string
  salaryGradeText: string
  salaryGradeSet: boolean
  shiftText: string
  shiftSet: boolean

  // Modal defaults — real, pre-filled by the backend when an assignment
  // already exists.
  userRole: string
  insertedId: string

  bankName: string
  accountNo: string
  ifsc: string
  micr: string
  comments: string

  gradeType: '' | 'llx_payroll_hourly_template' | 'llx_payroll_monthly_template'
  hourlyOptions: ManageSalaryOption[]
  hourlySelected: string
  monthlyOptions: ManageSalaryOption[]
  monthlySelected: string

  shiftOptions: ManageSalaryOption[]
  primaryShift: string
  secondaryShift: string
  startDate: string
  endDate: string
  alternateMode: 'none' | 'week' | 'month'

  leaveTypeOptions: ManageSalaryOption[]
  leaveTypeSelected: string[]
}

function selectOptions(select: HTMLSelectElement | null): ManageSalaryOption[] {
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ value: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
    .filter((o) => o.value !== '')
}

function selectedValue(select: HTMLSelectElement | null): string {
  return select?.selectedOptions[0]?.getAttribute('value') ?? ''
}

function selectedValues(select: HTMLSelectElement | null): string[] {
  return Array.from(select?.selectedOptions ?? [])
    .map((o) => o.getAttribute('value') ?? '')
    .filter((v) => v !== '')
}

export function parseManageSalaryRows(html: string): ManageSalaryRow[] {
  const doc = new DOMParser().parseFromString(`<table><tbody>${html}</tbody></table>`, 'text/html')
  const rows: ManageSalaryRow[] = []

  doc.querySelectorAll('tbody > tr').forEach((tr) => {
    const link = tr.querySelector<HTMLAnchorElement>('a[data-bs-target^="#assignList"]')
    const target = link?.getAttribute('data-bs-target') ?? ''
    const employeeId = Number(target.replace('#assignList', ''))
    if (!employeeId) return

    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    const id = employeeId
    const q = <T extends Element = Element>(sel: string) => tr.querySelector<T>(sel)

    const salaryGradeText = (tds[2]?.textContent ?? '').trim()
    const shiftText = (tds[3]?.textContent ?? '').trim()
    const alternateMode = (selectedValue(q<HTMLSelectElement>(`#alternate_mode${id}`)) || 'none') as ManageSalaryRow['alternateMode']

    rows.push({
      employeeId: id,
      employeeName: (tds[0]?.textContent ?? '').trim(),
      designation: (tds[1]?.textContent ?? '').trim(),
      salaryGradeText,
      salaryGradeSet: salaryGradeText !== 'Not Set',
      shiftText,
      shiftSet: shiftText !== 'Not Set',

      userRole: q<HTMLInputElement>(`#user_role${id}`)?.value ?? '',
      insertedId: q<HTMLInputElement>(`#inserted_id${id}`)?.value ?? '',

      bankName: q<HTMLInputElement>(`#b_name${id}`)?.value ?? '',
      accountNo: q<HTMLInputElement>(`#acc_no${id}`)?.value ?? '',
      ifsc: q<HTMLInputElement>(`#ifsc${id}`)?.value ?? '',
      micr: q<HTMLInputElement>(`#micr${id}`)?.value ?? '',
      comments: (q<HTMLTextAreaElement>(`#comments${id}`)?.value ?? '').trim(),

      gradeType: (q<HTMLInputElement>(`#gradeT${id}`)?.value ?? '') as ManageSalaryRow['gradeType'],
      hourlyOptions: selectOptions(q<HTMLSelectElement>(`#hourlySelect${id}`)),
      hourlySelected: selectedValue(q<HTMLSelectElement>(`#hourlySelect${id}`)),
      monthlyOptions: selectOptions(q<HTMLSelectElement>(`#monthlySelect${id}`)),
      monthlySelected: selectedValue(q<HTMLSelectElement>(`#monthlySelect${id}`)),

      shiftOptions: selectOptions(q<HTMLSelectElement>(`#shifts${id}`)),
      primaryShift: selectedValue(q<HTMLSelectElement>(`#shifts${id}`)) || '0',
      secondaryShift: selectedValue(q<HTMLSelectElement>(`#shifts_b${id}`)) || '0',
      startDate: q<HTMLInputElement>(`#stdate${id}`)?.value ?? '',
      endDate: q<HTMLInputElement>(`#enddate${id}`)?.value ?? '',
      alternateMode,

      leaveTypeOptions: selectOptions(q<HTMLSelectElement>(`#leavetype${id}`)),
      leaveTypeSelected: selectedValues(q<HTMLSelectElement>(`#leavetype${id}`)),
    })
  })

  return rows
}
