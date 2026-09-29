import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from '../settings/legacyAdminRequest'
import { parseAmount, readPieceCard, type PieceCard, type PieceCardOption } from './pieceCardParser'

// accountancy/bookkeeping/card.php — see pieceCardParser.ts. Every write is the page's own request
// (its token and hidden fields re-read right before it is sent) and is judged by re-reading the
// card, because the backend answers a form post with the whole page and no status.
const PATH = '/accountancy/bookkeeping/card.php'
const KEY = ['generalLedger', 'pieceCard'] as const

export const pieceRoute = (pieceNum: string, mode = '') => `/ledger/piece/${pieceNum}${mode ? `?mode=${mode}` : ''}`

export async function fetchPieceCard(pieceNum: string, mode: string): Promise<PieceCard | null> {
  return readPieceCard(await fetchLegacyDocument(PATH, new URLSearchParams({ piece_num: pieceNum, mode })), mode)
}

export function usePieceCard(pieceNum: string | undefined, mode: string) {
  return useQuery({ queryKey: [...KEY, pieceNum, mode], queryFn: () => fetchPieceCard(pieceNum ?? '', mode), enabled: !!pieceNum, staleTime: 0 })
}

// The journal choices only appear on the page's own "edit journal" form.
export function useJournalOptions(pieceNum: string | undefined, mode: string, enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, 'journals', pieceNum, mode],
    queryFn: async (): Promise<PieceCardOption[]> => {
      const doc = await fetchLegacyDocument(PATH, new URLSearchParams({ piece_num: pieceNum ?? '', action: 'editjournal', mode }))
      return Array.from(doc.querySelectorAll<HTMLOptionElement>('select[name="code_journal"] option'), (o) => ({ value: o.value.trim(), label: (o.textContent ?? '').trim() })).filter((o) => o.value && o.value !== '-1')
    },
    enabled: !!pieceNum && enabled,
    staleTime: 30_000,
  })
}

// The page's own script asks currency_ajax.php for the latest rate of a currency and puts it in the
// exchange-rate box.
export async function fetchExchangeRate(currency: string): Promise<string> {
  const text = await fetchLegacyText('/accountancy/bookkeeping/currency_ajax.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ type: 'getdetails', currID: currency }).toString(),
  })
  return text.trim()
}

const post = (pieceNum: string, body: URLSearchParams) =>
  legacyAdminSend(PATH, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }, `?${new URLSearchParams({ piece_num: pieceNum })}`)

const requireCard = (card: PieceCard | null, pieceNum: string): PieceCard => {
  if (!card) throw new Error(`Transaction ${pieceNum} was not found.`)
  return card
}

export type PieceHeaderField = 'date' | 'journal' | 'docRef'

// Date / Journal / Accounting Doc. are three separate forms on the page (`setdate`, `setjournal`,
// `setdocref`). `value` is yyyy-mm-dd for the date.
export function useUpdatePieceHeader(pieceNum: string, mode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ field, value }: { field: PieceHeaderField; value: string }): Promise<void> => {
      const before = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum)
      const body = new URLSearchParams({ token: before.token, mode })
      if (field === 'date') {
        const [y, m, d] = value.split('-')
        if (!y || !m || !d) throw new Error('Enter a valid date.')
        body.set('action', 'setdate')
        body.set('doc_date', `${m}/${d}/${y}`)
        body.set('doc_dateday', d)
        body.set('doc_datemonth', m)
        body.set('doc_dateyear', y)
      } else if (field === 'journal') {
        body.set('action', 'setjournal')
        body.set('code_journal', value)
      } else {
        if (!value.trim()) throw new Error('The accounting document cannot be empty.')
        body.set('action', 'setdocref')
        body.set('doc_ref', value)
      }
      await post(pieceNum, body)
      const after = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum)
      const stored = field === 'date' ? after.date : field === 'journal' ? after.journal : after.accountingDoc
      const wanted = field === 'date' ? `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}` : value
      if (stored !== wanted) throw new Error('The backend did not save the change.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

// The fields of the add / update row; amounts are what was typed.
export interface PieceLineInput {
  accountingaccount_number: string
  subledger_account: string
  subledger_label: string
  label_operation: string
  multicurrency_code: string
  currency_amo: string
  debit: string
  credit: string
}

const plain = (amount: string) => amount.replace(/[,\s]/g, '')
const lineFields = (input: PieceLineInput): Record<string, string> => ({ ...input, debit: plain(input.debit) || '0', credit: plain(input.credit) || '0', currency_amo: plain(input.currency_amo) })

export function useAddPieceLine(pieceNum: string, mode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PieceLineInput): Promise<void> => {
      const before = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum)
      await post(pieceNum, new URLSearchParams({ token: before.token, ...before.hidden, ...lineFields(input), save: 'Add' }))
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
      const before = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum)
      const fields = lineFields(input)
      await post(pieceNum, new URLSearchParams({ token: before.token, id, ...before.hidden, ...fields, update: 'Update' }))
      const line = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum).lines.find((l) => l.id === id)
      const same = (a: string, b: string) => Math.abs(parseAmount(a) - Number(b)) < 0.00005
      const squash = (text: string) => text.replace(/\s+/g, ' ').trim()
      if (!line || squash(line.label) !== squash(input.label_operation) || !same(line.debit, fields.debit) || !same(line.credit, fields.credit)) throw new Error('The backend did not save the change.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

// The trash icon's own link (it carries the token), taken from the freshly read page.
export function useDeletePieceLine(pieceNum: string, mode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const before = requireCard(await fetchPieceCard(pieceNum, mode), pieceNum)
      const href = before.lines.find((l) => l.id === id)?.deleteHref
      if (!href) throw new Error('This line can no longer be deleted.')
      await legacyAdminSend(href, { method: 'GET' })
      // Deleting the last line leaves no transaction at all.
      const after = await fetchPieceCard(pieceNum, mode)
      if (after?.lines.some((l) => l.id === id)) throw new Error('The backend did not delete the line.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

// "Validate Transaction": moves a scratch transaction into the ledger, under a new number.
export function useValidateTransaction(pieceNum: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const before = requireCard(await fetchPieceCard(pieceNum, '_tmp'), pieceNum)
      await legacyAdminSend(PATH, { method: 'GET' }, `?${new URLSearchParams({ piece_num: pieceNum, action: 'valid', token: before.token })}`)
      if (await fetchPieceCard(pieceNum, '_tmp')) throw new Error('The backend did not validate the transaction.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
