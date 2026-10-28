// Parses payroll/salary_temp.php's own Allowances/Deductions fee-type
// dropdown (llx_c_type_fees) — both the "Select Allowances"
// (name="a_label[]") and "Select Deductions" (name="d_label[]") selects
// list the same options (a shared fee-type dictionary, not two separate
// lists), so one scrape covers both tabs.

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
