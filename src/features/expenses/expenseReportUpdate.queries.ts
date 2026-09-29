import { useMutation, useQueryClient } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// expensereport/card.php?action=edit's real "update" form — confirmed live
// (172.16.5.10, id=1): POST to card.php with token/id/action=update/
// date_debut/date_fin (plain MM/dd/yyyy text fields, not a day/month/year
// triplet)/fk_user_validator, submit button name="bouton" value="Modify".
// Scoped to just the fields this page's own Details panel already shows
// (Period, User responsible for approval) rather than the full real edit
// form's much larger field set (address/bank/multicurrency/etc., all
// irrelevant to an expense report and not shown anywhere on this page).
export interface ExpenseReportUpdateInput {
  token: string
  dateDebut: string // MM/dd/yyyy, matching the real field's own format
  dateFin: string
  fkUserValidator: string
}

export function useUpdateExpenseReport(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ExpenseReportUpdateInput) => {
      if (!id) throw new Error('Missing expense report id.')
      const body = new URLSearchParams({
        token: input.token,
        id,
        action: 'update',
        bouton: 'Modify',
        date_debut: input.dateDebut,
        date_fin: input.dateFin,
        fk_user_validator: input.fkUserValidator,
      })
      const res = await fetch('/expensereport/card.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenseReports', 'card', id] }),
  })
}
