import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseAmount, type PieceCard, type PieceCardOption } from './pieceCardParser'
import { addPieceLine, deletePieceLine, loadCurrencyRate, loadJournalChoices, loadPiece, updatePieceHeader, updatePieceLine, validateDraft, type PieceLineBody } from './pieceFapi'

// accountancy/fapi/piece.php — see pieceFapi.ts. Every write is judged by re-reading the transaction, so a refusal or a silent no-op shows up.
const KEY = ['generalLedger', 'pieceCard'] as const

export const pieceRoute = (pieceNum: string, mode = '') => `/ledger/piece/${pieceNum}${mode ? `?mode=${mode}` : ''}`

export async function fetchPieceCard(pieceNum: string, mode: string): Promise<PieceCard | null> {
  return loadPiece(pieceNum, mode)
}

export function usePieceCard(pieceNum: string | undefined, mode: string) {
  return useQuery({ queryKey: [...KEY, pieceNum, mode], queryFn: () => fetchPieceCard(pieceNum ?? '', mode), enabled: !!pieceNum, staleTime: 0 })
}

// The journal choices of the "edit journal" box (create.php?action=form_options).
export function useJournalOptions(pieceNum: string | undefined, mode: string, enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, 'journals', pieceNum, mode],
    queryFn: (): Promise<PieceCardOption[]> => loadJournalChoices(),
    enabled: !!pieceNum && enabled,
    staleTime: 30_000,
  })
}

// The latest rate of a currency (currency.php?code=), put in the exchange-rate box.
export async function fetchExchangeRate(currency: string): Promise<string> {
  return loadCurrencyRate(currency)
}

const requireCard = (card: PieceCard | null, pieceNum: string): PieceCard => {
  if (!card) throw new Error(`Transaction ${pieceNum} was not found.`)
  return card
}

export type PieceHeaderField = 'date' | 'journal' | 'docRef'

// Date / Journal / Accounting Doc. are changed one at a time. `value` is yyyy-mm-dd for the date.
export function useUpdatePieceHeader(pieceNum: string, mode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ field, value }: { field: PieceHeaderField; value: string }): Promise<void> => {
      if (field === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a valid date.')
      if (field === 'docRef' && !value.trim()) throw new Error('The accounting document cannot be empty.')
      await updatePieceHeader(pieceNum, mode, field === 'date' ? { doc_date: value } : field === 'journal' ? { code_journal: value } : { doc_ref: value })
      const after = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum)
      const stored = field === 'date' ? after.date : field === 'journal' ? after.journal : after.accountingDoc
      const wanted = field === 'date' ? `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}` : value
      if (stored !== wanted) throw new Error('The backend did not save the change.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

// The fields of the add / update row; amounts are what was typed.
export type PieceLineInput = PieceLineBody

export function useAddPieceLine(pieceNum: string, mode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PieceLineInput): Promise<void> => {
      const before = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum)
      await addPieceLine(pieceNum, mode, input)
      const after = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum)
      if (after.lines.length <= before.lines.length) throw new Error('The backend did not add the line.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

export function useUpdatePieceLine(pieceNum: string, mode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PieceLineInput }): Promise<void> => {
      await updatePieceLine(pieceNum, mode, id, input)
      const line = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum).lines.find((l) => l.id === id)
      const same = (a: string, b: string) => Math.abs(parseAmount(a) - (Number(b.replace(/[,\s]/g, '')) || 0)) < 0.00005
      const squash = (text: string) => text.replace(/\s+/g, ' ').trim()
      if (!line || squash(line.label) !== squash(input.label_operation) || !same(line.debit, input.debit) || !same(line.credit, input.credit)) throw new Error('The backend did not save the change.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

export function useDeletePieceLine(pieceNum: string, mode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await deletePieceLine(pieceNum, mode, id)
      // Deleting the last line leaves no transaction at all.
      const after = await fetchPieceCard(pieceNum, mode)
      if (after?.lines.some((l) => l.id === id)) throw new Error('The backend did not delete the line.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

// "Validate Transaction": moves a draft transaction into the ledger, under a new number.
export function useValidateTransaction(pieceNum: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (): Promise<string> => validateDraft(pieceNum),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
