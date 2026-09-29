import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText, legacyRefusalMessages, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'
import { parsePayrollTable } from './payrollLegacyTable'
import { payrollListQueryKey } from './payrollLists.queries'
import { parseSalaryCalculation, type SalaryCalculation } from './salaryCalculationParser'
import { parseSalaryFeeTypes, type SalaryFeeType } from './salaryTemplateParser'

// payroll/salary_temp.php — the Salary Template form. Its right-hand panel is the
// backend's own calculation (payroll/loadcalculation.php, fed the whole form on
// every change) and Save is a POST of that same form to payroll/ajax.php?saveTemplate.

export type SalaryTemplateValueType = 'Fixed' | 'percentage'

export interface SalaryTemplateLine {
  feeTypeId: string
  valueType: SalaryTemplateValueType
  value: string
}

export interface SalaryTemplateInput {
  salaryGrade: string
  grossSalary: string
  basicPercent: string
  basicSalary: string
  overtimeMode: 'hourly' | 'premium'
  overtimeValue: string
  permittedLeave: string
  allowances: SalaryTemplateLine[]
  deductions: SalaryTemplateLine[]
}

export interface SalaryTemplatePage {
  feeTypes: SalaryFeeType[]
  bsAcode: string
  currencies: { value: string; label: string }[]
  defaultCurrency: string
}

// The fee-type dropdowns, the accounting code the page carries as a hidden field
// and the currency list. Looked up on the document: the page's markup is malformed
// enough that the form's controls are not descendants of its <form>.
export function useSalaryTemplatePage() {
  return useQuery({
    queryKey: ['payroll', 'salaryTemplate', 'page'],
    queryFn: async (): Promise<SalaryTemplatePage> => {
      const doc = await fetchLegacyDocument('/payroll/salary_temp.php')
      const currency = doc.querySelector<HTMLSelectElement>('select#multicurrency_code')
      const options = Array.from(currency?.options ?? [])
      return {
        feeTypes: parseSalaryFeeTypes(doc),
        bsAcode: doc.querySelector<HTMLInputElement>('input[name="bs_Acode"]')?.value ?? '',
        currencies: options.map((o) => ({ value: o.value, label: (o.textContent ?? '').trim() })),
        defaultCurrency: options.find((o) => o.hasAttribute('selected'))?.value ?? options[0]?.value ?? '',
      }
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function lineAmount(line: SalaryTemplateLine, basicSalary: number): number {
  const v = Number(line.value) || 0
  return line.valueType === 'percentage' ? (basicSalary / 100) * v : v
}

function lineTotal(lines: SalaryTemplateLine[], basicSalary: number) {
  return lines.reduce((sum, l) => sum + lineAmount(l, basicSalary), 0)
}

export function salaryTemplateTotals(input: SalaryTemplateInput) {
  const basic = Number(input.basicSalary) || 0
  return { allowances: lineTotal(input.allowances, basic), deductions: lineTotal(input.deductions, basic) }
}

// The form's own named fields, as the browser would submit them. PAYE tax is not
// supported here (is_taxin is always 0) — its bracket table is computed by the
// page's script, so a template with PAYE has to be made on the backend.
export function salaryTemplateFields(input: SalaryTemplateInput, page: Pick<SalaryTemplatePage, 'bsAcode' | 'defaultCurrency'>, currency?: string): URLSearchParams {
  const basic = Number(input.basicSalary) || 0
  const p = new URLSearchParams()
  p.set('salaryTemplateId', '')
  p.set('bs_Acode', page.bsAcode)
  p.set('salary_grade', input.salaryGrade.trim())
  p.set('multicurrency_code', currency || page.defaultCurrency)
  p.set('gross_salary', input.grossSalary)
  p.set('basic_per', input.basicPercent)
  p.set('basic_salary', input.basicSalary)
  p.set('is_taxin', '0')
  p.set('gratuity_per', '')
  p.set('gratuity_amount', '')
  if (input.overtimeValue.trim()) p.set('overtime_type', input.overtimeMode === 'hourly' ? '2' : '3')
  p.set('is_overtime', '1')
  p.set('overtime_salary', input.overtimeValue)
  p.set('permitted_leave', input.permittedLeave)
  p.set('per_day_settings', '')
  p.set('working_days', '')

  const addRows = (prefix: 'a' | 'd', lines: SalaryTemplateLine[]) => {
    const filled = lines.filter((l) => l.feeTypeId)
    // The page always has one (empty) row; send that when nothing was added.
    const rows = filled.length > 0 ? filled : [{ feeTypeId: '', valueType: 'Fixed' as const, value: '' }]
    for (const l of rows) {
      p.append(`${prefix}_label[]`, l.feeTypeId)
      p.append(`${prefix}_type[]`, l.valueType)
      p.append(`${prefix}_value[]`, l.value)
      p.append(`${prefix}_amt[]`, l.feeTypeId ? lineAmount(l, basic).toFixed(2) : '')
    }
  }
  const totals = salaryTemplateTotals(input)
  addRows('a', input.allowances)
  p.set('tatal_allow_value', String(totals.allowances))
  addRows('d', input.deductions)
  p.set('tatal_ded_value', String(totals.deductions))
  p.set('latest_val', '')
  p.set('tax_deduction', '')
  return p
}

async function fetchCalculation(fields: URLSearchParams): Promise<SalaryCalculation> {
  return parseSalaryCalculation(await fetchLegacyText('/payroll/loadcalculation.php', { method: 'POST', body: fields }))
}

// The backend's own calculation for what is on the form now.
export function useSalaryTemplateCalculation(input: SalaryTemplateInput, page: SalaryTemplatePage | undefined, currency: string) {
  const ready = !!page && Number(input.grossSalary) > 0 && Number(input.basicSalary) > 0
  const fields = page ? salaryTemplateFields(input, page, currency) : null
  return useQuery({
    queryKey: ['payroll', 'salaryTemplate', 'calculation', fields?.toString() ?? ''],
    queryFn: () => fetchCalculation(fields!),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
  })
}

async function existingGrades(): Promise<string[]> {
  const table = parsePayrollTable(await fetchLegacyDocument('/payroll/salary_temp.php'))
  const col = table.headers.findIndex((h) => /salary grades?/i.test(h))
  return col < 0 ? [] : table.rows.map((r) => r.cells[col].toLowerCase())
}

// Saves through the same POST the page's form sends, with the calculation's own
// fields (contribution ids and totals) added as the browser would. The backend
// answers with a redirect script rather than a status, so success is confirmed by
// finding the new grade on the page's list afterwards.
export function useCreateSalaryTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, page, currency }: { input: SalaryTemplateInput; page: SalaryTemplatePage; currency: string }) => {
      const grade = input.salaryGrade.trim().toLowerCase()
      if ((await existingGrades()).includes(grade)) throw new Error(`A salary template named "${input.salaryGrade.trim()}" already exists.`)

      const fields = salaryTemplateFields(input, page, currency)
      const calc = await fetchCalculation(fields)
      if (!calc.balanced) throw new Error(calc.message)

      const body = new URLSearchParams(fields)
      for (const [name, value] of calc.saveFields) body.append(name, value)
      body.set('saveTemplate', '')
      const res = await fetch('/payroll/ajax.php?saveTemplate', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)

      if (!(await existingGrades()).includes(grade)) {
        const refusal = toastMessages(html).find((t) => t.type === 'error')?.message ?? legacyRefusalMessages(html)[0]
        throw new Error(refusal ?? 'The backend did not save this salary template.')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollListQueryKey('salaryTemplate') }),
  })
}
