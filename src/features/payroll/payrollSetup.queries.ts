import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { hrmGet } from './hrm.api'

// custom/payroll/admin/setup.php — a plain classic form, no CSRF token,
// POSTing back to itself. Each accounting-code row is a `<select
// name="acc_code[]">` populated from `llx_accounting_account` (reused here
// via the same /accountancy/admin/fetch.php endpoint the General Ledger
// chart-of-accounts tree uses), the bank field is a `<select
// name="fk_account">` (the same accounts useBankAccountsList fetches), and
// Update posts every row + the 3 constants back in one classic multi-value
// form submit.
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

// payroll/fapi/setup.php: the six salary codes, the bank, the NAPSA limit and the salary basis, with the same field names
// as the classic page's controls (checked live on newecuenta: identical to what the classic page held).
export function usePayrollSetup() {
  return useQuery({
    queryKey: ['payroll', 'setup'],
    queryFn: async (): Promise<PayrollSetup> => {
      const d = await hrmGet<{ rows: PayrollSetupRow[]; bankAccountId: string | number | null; napsaLimit: string | number | null; salaryCalculationFrom: string | null }>('setup')
      return {
        rows: d.rows.map((r) => ({
          key: r.key,
          label: r.label,
          codeId: String(r.codeId ?? ''),
          currentAccountancyCode: String(r.currentAccountancyCode ?? ''),
          selectedAccountNumber: String(r.selectedAccountNumber ?? ''),
        })),
        bankAccountId: d.bankAccountId === null || d.bankAccountId === undefined ? '' : String(d.bankAccountId),
        napsaLimit: d.napsaLimit === null || d.napsaLimit === undefined ? '' : String(d.napsaLimit),
        salaryCalculationFrom: d.salaryCalculationFrom === 'basic' || d.salaryCalculationFrom === 'gross' ? d.salaryCalculationFrom : '',
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
