// Parses payroll/salary_temp.php's own real Allowances/Deductions fee-type
// dropdown (llx_c_type_fees, confirmed live) — both the "Select Allowances"
// (name="a_label[]") and "Select Deductions" (name="d_label[]") selects
// list the exact same 5 real options (a shared fee-type dictionary, not two
// separate lists), so one scrape covers both tabs.

export interface SalaryFeeType {
  value: string
  label: string
}

export function parseSalaryFeeTypes(doc: Document): SalaryFeeType[] {
  const select = doc.querySelector('select[name="a_label[]"]') ?? doc.querySelector('select[name="d_label[]"]')
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ value: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
    .filter((o) => o.value)
}
