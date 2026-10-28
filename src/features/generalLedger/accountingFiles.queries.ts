import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { choicesFrom, downloadAccountingZip, loadAccountingFiles } from './accountingFilesFapi'
import type { AccountingFilesPage } from './accountingFiles.types'

// accountancy/fapi/accounting_files.php — see accountingFilesFapi.ts. Searching is read-only; the download only builds a zip.
export interface AccountingFilesSearch {
  // yyyy-mm-dd
  dateStart: string
  dateEnd: string
  // Names of the kinds of document to list (`invoices`, `supplierinvoices`, …).
  kinds: string[]
}

export interface AccountingFilesResult extends AccountingFilesPage {
  // What the backend said when it refused the search.
  errors: string[]
}

// `search` null shows the form alone (every kind ticked, nothing listed yet).
async function fetchAccountingFiles(search: AccountingFilesSearch | null): Promise<AccountingFilesResult> {
  if (!search) return { environment: '', choices: choicesFrom(null), searched: false, period: '', headers: [], rows: [], totals: [], downloadFields: {}, errors: [] }
  return { ...(await loadAccountingFiles(search)), errors: [] }
}

export function useAccountingFiles(search: AccountingFilesSearch | null) {
  return useQuery({ queryKey: ['generalLedger', 'accountingFiles', 'fapi', search], queryFn: () => fetchAccountingFiles(search), staleTime: 0, placeholderData: keepPreviousData })
} 

// "Download Report": the period's documents as a zip, from accounting_files.php?action=zip.
export function useDownloadAccountingFiles() {
  return useMutation({
    mutationFn: ({ search }: { fields: Record<string, string>; search: AccountingFilesSearch }): Promise<string> => downloadAccountingZip(search),
  })
}
