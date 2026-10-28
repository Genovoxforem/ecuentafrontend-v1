import { fapi } from '../../api/axios'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import { loadBindableAccounts } from './bindingFapi'
import { usDateFromIso as usDate } from '../../utils/dates'
import type { PieceCard, PieceCardAddRow, PieceCardLine, PieceCardOption } from './pieceCard.types'

// accountancy/fapi/piece.php?piece_num=N&action=delete: removes every line of the transaction. The endpoint answers 409 when the transaction is
// exported or validated, 403 without the delete right and 404 for an unknown piece, each with its own message.
export async function deletePiece(pieceNum: string): Promise<void> {
  await fapiPost<{ piece_num: string; deleted: boolean }>('/accountancy/fapi/piece.php', {}, { piece_num: pieceNum, action: 'delete' })
}

// The transaction number a ledger row's delete link carries (…&mvt_num=N).
export const pieceNumFromDeleteUrl = (url: string): string => new URLSearchParams(url.split('?')[1] ?? '').get('mvt_num') ?? ''

// ---- Reading and editing one transaction: piece.php --------------------------------------------------------------------------------------


// accountancy/fapi/piece.php (22-23 Oct 2026): GET reads the transaction (mode=_tmp for a draft), POST updates the header or one line,
// action=add_line / delete_line change the lines, action=validate_draft moves a draft into the ledger and action=delete removes the whole
// piece. The read answer was captured from newecuenta on 23 Oct 2026 (tests/fixtures/accountancy-piece.json). The write answers are
// "representative" in the document; their refusals (422 / 400 / 404) were probed live with empty or unknown bodies and nothing was written.

export interface FapiPieceLine {
  id: number
  numero_compte: string
  account_label: string
  subledger_account: string
  subledger_label: string
  label_operation: string
  debit: number
  credit: number
  currency_code: string
  currency_amo: number
  cur_debit: number
  cur_credit: number
}
export interface FapiPiece {
  piece_num: string
  mode: string
  doc_date: string
  code_journal: string
  journal_label: string
  doc_ref: string
  doc_type: string
  fk_doc: number
  date_creation: string | null
  currency_code: string
  lines: FapiPieceLine[]
  is_locked: boolean
  can_edit: boolean
  can_delete: boolean
}
export interface FapiFormOptions {
  journals: Array<{ id: number; code: string; label: string }>
  currencies: Array<{ code: string; rate: number; is_base: boolean }>
  base_currency: string
}

export function mapPiece(d: FapiPiece, accounts: PieceCardOption[], options: FapiFormOptions): PieceCard {
  // A locked (exported or validated) transaction cannot be changed, so it offers neither the add row nor the line actions.
  const editable = d.can_edit && !d.is_locked
  const add: PieceCardAddRow | null = editable
    ? { accountOptions: accounts, currencyOptions: options.currencies.map((c) => ({ value: c.code, label: c.code })), currency: options.base_currency, exchangeRate: '1.00' }
    : null
  const lines: PieceCardLine[] = d.lines.map((l) => ({
    id: String(l.id),
    account: l.numero_compte,
    accountLabel: l.account_label,
    subledger: l.subledger_account,
    subledgerLabel: l.subledger_label,
    label: l.label_operation,
    currency: l.currency_code,
    exchangeRate: l.currency_amo ? String(l.currency_amo) : '',
    debit: l.debit ? formatMoney(l.debit) : '',
    debitConverted: l.cur_debit ? formatMoney(l.cur_debit) : '',
    credit: l.credit ? formatMoney(l.credit) : '',
    creditConverted: l.cur_credit ? formatMoney(l.cur_credit) : '',
    // The line's id marks it as deletable; a locked transaction has none.
    deleteHref: editable ? String(l.id) : null,
  }))
  return {
    pieceNum: d.piece_num,
    mode: d.mode,
    date: usDate(d.doc_date),
    journal: d.code_journal,
    accountingDoc: d.doc_ref,
    docType: d.doc_type,
    creationDate: d.date_creation ? usDate(d.date_creation) : '',
    currencyLabel: d.currency_code,
    lines,
    add,
    token: '',
    hidden: { mode: d.mode, doc_type: d.doc_type, fk_doc: String(d.fk_doc) },
  }
}

export const loadFormOptions = () => fapiGet<FapiFormOptions>('/accountancy/fapi/create.php', { action: 'form_options' })

// null when the transaction does not exist (404).
export async function loadPiece(pieceNum: string, mode: string): Promise<PieceCard | null> {
  const res = await fapi.get('/accountancy/fapi/piece.php', { params: { piece_num: pieceNum, mode: mode || undefined }, validateStatus: (s) => s === 200 || s === 404 })
  if (res.status === 404) return null
  const [accounts, options] = await Promise.all([loadBindableAccounts().then((a) => a.map((o) => ({ value: o.label.split(' - ')[0], label: o.label }))), loadFormOptions()])
  return mapPiece((res.data as { data: FapiPiece }).data, accounts, options)
}

// The latest rate of a currency against the base (currency.php?code=), as the text the rate box shows.
export async function loadCurrencyRate(code: string): Promise<string> {
  const d = await fapiGet<{ rate: number; found: boolean }>('/accountancy/fapi/currency.php', { code })
  return d.found ? String(d.rate) : ''
}

export async function loadJournalChoices(): Promise<PieceCardOption[]> {
  return (await loadFormOptions()).journals.map((j) => ({ value: j.code, label: `${j.code} - ${j.label}` }))
}

const piecePost = <T>(pieceNum: string, mode: string, body: object, action?: string) =>
  fapiPost<T>('/accountancy/fapi/piece.php', body, { piece_num: pieceNum, mode: mode || undefined, action })

export interface PieceLineBody {
  accountingaccount_number: string
  subledger_account: string
  subledger_label: string
  label_operation: string
  multicurrency_code: string
  currency_amo: string
  debit: string
  credit: string
}

const n = (v: string) => Number(v.replace(/[,\s]/g, '')) || 0

export const pieceLineBody = (i: PieceLineBody) => ({
  accountingaccount_number: i.accountingaccount_number,
  subledger_account: i.subledger_account || undefined,
  subledger_label: i.subledger_label || undefined,
  label_operation: i.label_operation,
  multicurrency_code: i.multicurrency_code || undefined,
  currency_amo: n(i.currency_amo) || undefined,
  debit: n(i.debit),
  credit: n(i.credit),
})

export const addPieceLine = (pieceNum: string, mode: string, i: PieceLineBody) => piecePost(pieceNum, mode, pieceLineBody(i), 'add_line')
export const deletePieceLine = (pieceNum: string, mode: string, lineId: string) => piecePost(pieceNum, mode, { line_id: Number(lineId) }, 'delete_line')
export const updatePieceLine = (pieceNum: string, mode: string, lineId: string, i: PieceLineBody) =>
  piecePost(pieceNum, mode, { line_id: Number(lineId), numero_compte: i.accountingaccount_number, subledger_account: i.subledger_account, label_operation: i.label_operation, debit: n(i.debit), credit: n(i.credit) })
export const updatePieceHeader = (pieceNum: string, mode: string, header: { doc_date?: string; code_journal?: string; doc_ref?: string }) => piecePost(pieceNum, mode, header)

// Moves a draft transaction into the ledger; resolves to its new number.
export async function validateDraft(pieceNum: string): Promise<string> {
  const res = await piecePost<{ piece_num: number | string }>(pieceNum, '_tmp', { piece_num: Number(pieceNum) }, 'validate_draft')
  return String(res.piece_num)
}
