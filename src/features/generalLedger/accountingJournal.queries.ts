import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseAccountingJournal } from './accountingJournalParser'

// One entry per real journal page (all confirmed live — see
// accountingJournalParser.ts).
export interface JournalConfig {
  key: string
  path: string
  idJournal: string
}

export const FINANCE_JOURNAL: JournalConfig = { key: 'finance', path: '/accountancy/journal/bankjournal.php', idJournal: '3' }
export const EXPENSE_JOURNAL: JournalConfig = { key: 'expense', path: '/accountancy/journal/expensereportsjournal.php', idJournal: '6' }
export const SELL_JOURNAL: JournalConfig = { key: 'sell', path: '/accountancy/journal/sellsjournal.php', idJournal: '1' }
export const PURCHASE_JOURNAL: JournalConfig = { key: 'purchase', path: '/accountancy/journal/purchasesjournal.php', idJournal: '2' }

export interface JournalFilters {
  dateStart: string // MM/dd/yyyy — empty means "let the real page pick its default month"
  dateEnd: string
  inBookkeeping: string
}

function dateFields(prefix: 'date_start' | 'date_end', us: string): Record<string, string> {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? { [prefix]: us, [`${prefix}month`]: m[1], [`${prefix}day`]: m[2], [`${prefix}year`]: m[3] } : {}
}

export function useAccountingJournal(config: JournalConfig, filters: JournalFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'journal', config.key, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ id_journal: config.idJournal, ...dateFields('date_start', filters.dateStart), ...dateFields('date_end', filters.dateEnd) })
      if (filters.inBookkeeping) params.set('in_bookkeeping', filters.inBookkeeping)
      return parseAccountingJournal(await fetchLegacyDocument(config.path, params))
    },
  })
}

async function postForm(config: JournalConfig, token: string, filters: JournalFilters, action: 'exportcsv' | 'writebookkeeping'): Promise<Response> {
  const body = new URLSearchParams({
    token,
    action,
    ...dateFields('date_start', filters.dateStart),
    ...dateFields('date_end', filters.dateEnd),
    in_bookkeeping: filters.inBookkeeping,
    submit: 'Refresh',
  })
  const res = await fetch(`${config.path}?id_journal=${config.idJournal}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res
}

// action=exportcsv — the real page answers with a CSV attachment.
export async function downloadJournalCsv(config: JournalConfig, token: string, filters: JournalFilters): Promise<void> {
  const res = await postForm(config, token, filters, 'exportcsv')
  const blob = await res.blob()
  if (blob.type.includes('html')) {
    const html = await blob.text()
    if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
    throw new Error('The backend did not return a CSV file for this range.')
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${config.key}-journal.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// action=writebookkeeping — writes every listed line into the accounting
// ledger (accounting_bookkeeping); the transactions then move to the
// "Already transferred" list. Real, non-reversible from this screen.
export function useWriteBookkeeping(config: JournalConfig) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ token, filters }: { token: string; filters: JournalFilters }) => {
      const res = await postForm(config, token, filters, 'writebookkeeping')
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
