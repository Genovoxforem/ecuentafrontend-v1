import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, legacyMissingContentError, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// custom/payroll/admin/setup.php — real, confirmed by reading that file
// directly
// (it was previously assumed to have no JSON API and shown as an inert,
// read-only placeholder — that assumption was wrong: it's a plain classic
// form, no CSRF token, POSTing back to itself). Each accounting-code row is
// a real `<select name="acc_code[]">` populated from `llx_accounting_account`
// (reused here via the same real /accountancy/admin/fetch.php endpoint the
// General Ledger chart-of-accounts tree already uses), the bank field is a
// real `<select name="fk_account">` (the same accounts useBankAccountsList
// already fetches), and Update posts every row + the 3 constants back in one
// classic multi-value form submit.
export interface PayrollSetupRow {
  key: string // name="key[]" — the llx_c_type_fees.code, e.g. "Basic001"
  label: string // name="idd[]" — llx_c_type_fees.label, e.g. "Basic Salary"
  codeId: string // hidden name="codeid[]" — llx_c_type_fees.id if this row already exists there, '' otherwise
  currentAccountancyCode: string // hidden name="iddfees[]" — current llx_c_type_fees.accountancy_code, '' if never set
  selectedAccountNumber: string // the currently `selected` <option> in acc_code[], '' if still "Select Accounting Code..."
}

export interface PayrollSetup {
  rows: PayrollSetupRow[]
  bankAccountId: string // currently selected fk_account option value, '' if none
  napsaLimit: string
  salaryCalculationFrom: 'basic' | 'gross' | ''
}

function textInput(scope: ParentNode, name: string): string {
  return (scope.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value ?? '').trim()
}

function selectedOptionValue(scope: ParentNode, name: string): string {
  const select = scope.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  const selected = select?.querySelector<HTMLOptionElement>('option[selected]')
  return selected?.getAttribute('value') ?? ''
}

export function usePayrollSetup() {
  return useQuery({
    queryKey: ['payroll', 'setup'],
    queryFn: async (): Promise<PayrollSetup> => {
      const doc = await fetchLegacyDocument('/custom/payroll/admin/setup.php')
      const table = doc.querySelector('#example1')
      if (!table) throw legacyMissingContentError(doc, 'The Payroll Setup page was not recognised.')

      const rows: PayrollSetupRow[] = Array.from(table.querySelectorAll('input[name="key[]"]')).map((keyInput) => {
        const tr = (keyInput as HTMLInputElement).closest('tr') as ParentNode
        const accSelected = selectedOptionValue(tr, 'acc_code[]')
        return {
          key: (keyInput as HTMLInputElement).value,
          label: textInput(tr, 'idd[]'),
          codeId: textInput(tr, 'codeid[]'),
          currentAccountancyCode: textInput(tr, 'iddfees[]'),
          selectedAccountNumber: accSelected === '-1' ? '' : accSelected,
        }
      })

      const bankValue = selectedOptionValue(table, 'fk_account')
      const salaryValue = selectedOptionValue(table, 'salary_calculation_from')

      return {
        rows,
        bankAccountId: bankValue,
        napsaLimit: textInput(table, 'napsa_limit'),
        salaryCalculationFrom: salaryValue === 'basic' || salaryValue === 'gross' ? salaryValue : '',
      }
    },
    staleTime: 1000 * 30,
  })
}

export interface UpdatePayrollSetupInput {
  rows: Array<{ key: string; label: string; codeId: string; currentAccountancyCode: string; accountNumber: string }>
  bankAccountId: string
  napsaLimit: string
  salaryCalculationFrom: 'basic' | 'gross'
}

// Same POST the real form's own "Update" button sends — every row plus the
// 3 constants in one submit (see setup.php's own bottom handler: it loops
// `idd[]` and, per row, either INSERTs a new llx_c_type_fees row (when that
// row never had an accountancy_code) or UPDATEs the existing one by
// codeid[] — always re-saving the bank/NAPSA/salary constants alongside).
// The real backend replies with a tiny redirect script on success, not JSON.
export function useUpdatePayrollSetup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdatePayrollSetupInput): Promise<void> => {
      const body = new URLSearchParams()
      for (const r of input.rows) {
        body.append('key[]', r.key)
        body.append('idd[]', r.label)
        body.append('codeid[]', r.codeId)
        body.append('iddfees[]', r.currentAccountancyCode)
        body.append('acc_code[]', r.accountNumber || '-1')
      }
      body.set('fk_account', input.bankAccountId)
      body.set('napsa_limit', input.napsaLimit)
      body.set('salary_calculation_from', input.salaryCalculationFrom)
      body.set('submitt', 'Update')

      const res = await fetch('/custom/payroll/admin/setup.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'setup'] })
    },
  })
}
