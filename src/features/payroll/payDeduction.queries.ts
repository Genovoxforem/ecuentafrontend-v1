import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyText, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parsePayDeductionRows, parseExpenseCategoryOptions, type PayDeductionRow, type SelectOption } from './payDeductionParser'

const LIST_PATH = '/payroll/pay_deduction.php?idmenu=655112377&mainmenu=payroll&leftmenu=allow_deduc_obj'
const QUERY_KEY = ['payroll', 'payDeduction', 'list']

export interface PayDeductionListPage {
  rows: PayDeductionRow[]
  expenseCategoryOptions: SelectOption[]
}

export function usePayDeductionListPage() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<PayDeductionListPage> => {
      const html = await fetchLegacyText(LIST_PATH)
      return { rows: parsePayDeductionRows(html), expenseCategoryOptions: parseExpenseCategoryOptions(html) }
    },
  })
}

function monthIsoToLabel(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export interface PayDeductionRowInput {
  expenseTypeId: string
  kind: 'Allowance' | 'Deduction'
  amount: string
}
export interface NewPayDeductionInput {
  employeeId: string
  startMonth: string // YYYY-MM
  endMonth: string // YYYY-MM
  rows: PayDeductionRowInput[]
}

// Real via payroll/ajax.php?type=user_payment (pay_deduction.php's own
// #savepaydeduct click handler, read directly) — confirmed live this
// session with a real test write. Unlike every other payroll/ajax.php
// action in payrollActions.queries.ts (a bare 0/3/other status code), this
// one echoes "1" for success specifically (its own JS checks
// `response == 1`), so it can't reuse that file's shared postPayrollAjax
// helper.
export function useCreatePayDeduction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewPayDeductionInput): Promise<void> => {
      const body = new URLSearchParams({
        ListofEmployee: input.employeeId,
        startmonthPic: monthIsoToLabel(input.startMonth),
        endmonthPic: monthIsoToLabel(input.endMonth),
        type: 'user_payment',
        count: String(input.rows.length),
      })
      input.rows.forEach((row, i) => {
        const n = i + 1
        body.set(`expense_id_${n}`, row.expenseTypeId)
        body.set(`exp_type_${n}`, row.kind === 'Allowance' ? '1' : '2')
        body.set(`pay_amount_${n}`, row.amount)
      })
      const res = await fetch('/payroll/ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = (await res.text()).trim()
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (text !== '1') throw new Error('The legacy backend rejected the request.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
