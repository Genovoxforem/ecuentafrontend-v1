import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { journalCsv, loadJournal, writeJournal } from './accountingJournalFapi'
import type { JournalPage } from './accountingJournalParser'

// One entry per accounting journal: its key is the `journal` the accountancy/fapi/journals.php endpoint takes.
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
  dateStart: string // MM/dd/yyyy — empty means "let the backend pick its default month"
  dateEnd: string
  inBookkeeping: string
}

export function useAccountingJournal(config: JournalConfig, filters: JournalFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'journal', 'fapi', config.key, filters],
    queryFn: () => loadJournal(config.key, filters),
  })
}

// The CSV is built from the rows on screen (the old page's own export is not in the API).
export async function downloadJournalCsv(config: JournalConfig, page: JournalPage): Promise<void> {
  const url = URL.createObjectURL(new Blob([journalCsv(page)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${config.key}-journal.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// action=writebookkeeping — writes the listed documents to the accounting ledger, one transaction per document; the
// transactions then move to the "Already journalized" list. Real, non-reversible from this screen.
export function useWriteBookkeeping(config: JournalConfig) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ filters }: { filters: JournalFilters }) => writeJournal(config.key, filters),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
