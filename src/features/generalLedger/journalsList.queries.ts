import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { exportJournals, loadJournalsList, saveJournalColumns, writeReexport } from './journalsListFapi'
import { deletePiece } from './pieceFapi'

// accountancy/fapi/list.php — see journalsListFapi.ts for what the endpoint does.
const KEY = ['generalLedger', 'journalsList'] as const

export interface JournalsRequest {
  // null = ask with no filter at all, which makes the endpoint apply the current fiscal year.
  filters: Record<string, string> | null
  limit: number | null
  // 0-based
  page: number
}

export function useJournalsList(req: JournalsRequest) {
  return useQuery({ queryKey: [...KEY, 'fapi', req], queryFn: () => loadJournalsList(req), staleTime: 0, placeholderData: keepPreviousData })
}

// "Include docs already exported": whether exported lines are listed (include_exported=1). The app keeps the choice.
export function useToggleReexport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (enable: boolean): Promise<void> => writeReexport(enable),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// Deletes every line of one transaction (piece.php?action=delete; refused with 409 once exported or validated).
export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (pieceNum: string): Promise<void> => deletePiece(pieceNum),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

// The picker of shown columns is a per-user setting (list.php?action=columns), shared with the classic page.
export function useSaveJournalColumns() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (keys: string[]): Promise<void> => {
      const saved = await saveJournalColumns(keys)
      if (saved.length !== keys.length || keys.some((k) => !saved.includes(k))) throw new Error('The backend did not save the column choice.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The export (list.php?action=export): the backend answers with the file in the configured export format and marks every exported line.
export function useExportJournals() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (filters: Record<string, string>): Promise<string> => exportJournals(filters),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
