import { useMutation, useQueryClient } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// expensereport/card.php's real header actions (Modify/Validate/Clone/
// Delete) — confirmed live against 172.16.5.10 by reading the real page's
// own #confirmModal / #cloneConfirmModal markup directly (not the plain
// href each button shows, which just opens that modal client-side): both
// are real 2-step POSTs to card.php?id=N with token + action=confirm_* +
// confirm=yes. Delete needs nothing else; Clone genuinely requires picking
// which user to clone the report for (its own #userid select — see
// expenseReportCardParser.ts's cloneUserOptions).
async function postCardAction(id: string, token: string, fields: Record<string, string>): Promise<void> {
  const body = new URLSearchParams({ token, confirm: 'yes', ...fields })
  const res = await fetch(`/expensereport/card.php?id=${id}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
}

export function useDeleteExpenseReport(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (token: string) => {
      if (!id) throw new Error('Missing expense report id.')
      await postCardAction(id, token, { action: 'confirm_delete' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenseReports'] }),
  })
}

export function useCloneExpenseReport(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ token, userid }: { token: string; userid: string }) => {
      if (!id) throw new Error('Missing expense report id.')
      await postCardAction(id, token, { action: 'confirm_clone', object: 'expensereport', userid })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenseReports'] }),
  })
}
