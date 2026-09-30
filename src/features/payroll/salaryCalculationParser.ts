// Parses payroll/loadcalculation.php — the HTML fragment the Salary Template page
// fills its right-hand panel with (the page POSTs its whole form to it, on every
// change). Verified live against two dev backends. It says whether the allowance
// split adds up to the gross ("* Salary Allocation is Successful", or "* Adjust
// The Payment To Equilize Gross Pay, Pending Amount …"), lists the backend's own
// contribution rows (Napsa, Nhima, … — which differ per installation), and gives
// the totals. Its named inputs (`tax_prec[]`, `tax_type[]`, `dedu_id[]`,
// `tax_ded[]`, `paye_deduction`, `sum_deduc`, `sum_gross`, `sum_nett`) live inside
// the form on the real page, so the browser submits them with Save — `saveFields`
// carries them so a native Save can send the same.

export interface SalaryContribution {
  label: string
  amount: string
}

export interface SalaryCalculation {
  balanced: boolean
  message: string
  contributions: SalaryContribution[]
  totalContributions: string
  payeTax: string
  totalDeductions: string
  netSalary: string
  saveFields: [string, string][]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseSalaryCalculation(html: string): SalaryCalculation {
  const body = new DOMParser().parseFromString(html ?? '', 'text/html').body
  const status = body.querySelector('div[style*="olor"]')
  if (!status) throw new Error('The salary calculation on this backend page was not recognised.')

  const value = (selector: string) => (body.querySelector<HTMLInputElement>(selector)?.getAttribute('value') ?? '').trim()

  const contributions: SalaryContribution[] = Array.from(body.querySelectorAll<HTMLInputElement>('input[name="tax_ded[]"]')).map((input, i) => {
    const percent = body.querySelectorAll('input[name="tax_prec[]"]')[i]
    return { label: text(percent?.previousElementSibling), amount: (input.getAttribute('value') ?? '').trim() }
  })

  const saveFields: [string, string][] = []
  body.querySelectorAll<HTMLInputElement>('input[name]').forEach((input) => {
    const name = input.getAttribute('name') ?? ''
    if (['tax_prec[]', 'tax_type[]', 'dedu_id[]', 'tax_ded[]', 'paye_deduction', 'sum_deduc', 'sum_gross', 'sum_nett'].includes(name)) {
      saveFields.push([name, (input.getAttribute('value') ?? '').trim()])
    }
  })

  return {
    balanced: /green/i.test(status.getAttribute('style') ?? ''),
    message: text(status).replace(/^\*\s*/, ''),
    contributions,
    totalContributions: value('#total_contri'),
    payeTax: value('#payetax'),
    totalDeductions: value('#sum_deduc_amount'),
    netSalary: value('#sum_net'),
    saveFields,
  }
}
