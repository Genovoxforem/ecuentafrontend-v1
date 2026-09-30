import { cellText } from './legacyTable'

// accountancy/bookkeeping/card.php?piece_num=N[&mode=_tmp] ("Modification of a transaction").
// From the page's own PHP and its live markup:
//   - a transaction lives in the ledger (mode '') or, while it is being entered, in a scratch table
//     (mode `_tmp`, where the page offers "Validate Transaction" once debit equals credit; the
//     backend then moves it into the ledger under a new number);
//   - the header shows the number, the date / journal / accounting doc. (each with an edit pencil),
//     the type of document and the creation date; the movements table has the exchange rate and the
//     amount in the foreign currency under each debit / credit, and an "add" row on the bottom
//     (its selects hold the chart of accounts and the currencies);
//   - the movements form carries the transaction's own hidden fields (doc_date as a timestamp,
//     doc_type, doc_ref, code_journal, fk_doc, fk_docdet, mode) that an added line must repeat.

export interface PieceCardLine {
  id: string
  account: string
  accountLabel: string
  subledger: string
  subledgerLabel: string
  label: string
  currency: string
  exchangeRate: string
  debit: string
  debitConverted: string
  credit: string
  creditConverted: string
  // Root-relative delete link as printed (it carries the page's token), null when absent.
  deleteHref: string | null
}

export interface PieceCardOption {
  value: string
  label: string
}

export interface PieceCardAddRow {
  accountOptions: PieceCardOption[]
  currencyOptions: PieceCardOption[]
  currency: string
  exchangeRate: string
}

export interface PieceCard {
  pieceNum: string
  mode: string
  date: string
  journal: string
  accountingDoc: string
  docType: string
  creationDate: string
  // Currency of the debit / credit columns, from "Debit (ZMW)".
  currencyLabel: string
  lines: PieceCardLine[]
  add: PieceCardAddRow | null
  token: string
  hidden: Record<string, string>
}

// Amounts are printed with `,` for thousands and `.` for decimals.
export function parseAmount(text: string): number {
  const n = Number(text.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function options(select: Element | null | undefined): PieceCardOption[] {
  return Array.from(select?.querySelectorAll('option') ?? [], (o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: cellText(o) })).filter((o) => o.value && o.value !== '-1')
}

// A cell like `200.00<br><span>(200.00)</span>`: the amount and, in brackets, the converted amount.
function amountCell(td: Element | undefined): { main: string; converted: string } {
  if (!td) return { main: '', converted: '' }
  const copy = td.cloneNode(true) as Element
  const span = copy.querySelector('span')
  const converted = cellText(span).replace(/^\(|\)$/g, '')
  span?.remove()
  return { main: cellText(copy), converted }
}

// "1087 - <span>Accounts receivable</span>": the code, then the label in a muted span.
function codeAndLabel(td: Element | undefined): { code: string; label: string } {
  if (!td) return { code: '', label: '' }
  const label = cellText(td.querySelector('.opacitymedium'))
  const copy = td.cloneNode(true) as Element
  copy.querySelector('.opacitymedium')?.remove()
  return { code: cellText(copy).replace(/\s*-\s*$/, ''), label }
}

export function readPieceCard(doc: Document, mode: string): PieceCard | null {
  const movements = doc.querySelector('table.alignTopAllColumns')
  const left = doc.querySelector('.fichehalfleft table')
  // A number with no transaction prints a "NoRecords" title and no tabs.
  if (!left || !doc.querySelector('a#transaction')) return null

  const rows = Array.from((left as HTMLTableElement).rows)
  const valueOf = (needle: string) => {
    const row = rows.find((r) => r.querySelector(`a[href*="${needle}"]`))
    return cellText(row?.cells[row.cells.length - 1])
  }

  let docType = ''
  let creationDate = ''
  doc.querySelectorAll('.fichehalfright table tr').forEach((tr) => {
    if (tr.children.length < 2) return
    const label = cellText(tr.children[0])
    const value = cellText(tr.children[1])
    if (/creation/i.test(label)) creationDate = value
    else if (!docType) docType = value
  })

  const form = movements?.closest('form') ?? null
  const hidden: Record<string, string> = {}
  form?.querySelectorAll<HTMLInputElement>('input[type="hidden"]').forEach((el) => {
    if (el.name && el.name !== 'token') hidden[el.name] = el.value
  })

  const headers = Array.from(movements?.querySelectorAll('th') ?? [], (th) => cellText(th))
  const currencyLabel = /^debit\s*\((.+)\)/i.exec(headers.find((h) => /^debit/i.test(h)) ?? '')?.[1] ?? ''

  const lines: PieceCardLine[] = []
  let add: PieceCardAddRow | null = null
  for (const tr of Array.from(movements?.querySelectorAll('tr.oddeven') ?? [])) {
    const accountSelect = tr.querySelector('select[name="accountingaccount_number"]')
    if (accountSelect) {
      const currencySelect = tr.querySelector<HTMLSelectElement>('select[name="multicurrency_code"]')
      add = {
        accountOptions: options(accountSelect),
        currencyOptions: options(currencySelect),
        currency: currencySelect?.selectedOptions[0]?.value ?? '',
        exchangeRate: tr.querySelector<HTMLInputElement>('input[name="currency_amo"]')?.value ?? '1.00',
      }
      continue
    }
    const tds = Array.from(tr.children)
    const editLink = tr.querySelector('a[href*="action=update"]')
    // Only a plain line has an edit link; a line being edited (a form row) is not read.
    if (tds.length < 7 || !editLink) continue
    const id = new URL(editLink.getAttribute('href') ?? '', 'http://backend.invalid').searchParams.get('id') ?? ''
    const account = codeAndLabel(tds[0])
    const subledger = codeAndLabel(tds[1])
    const debit = amountCell(tds[5])
    const credit = amountCell(tds[6])
    lines.push({
      id,
      account: account.code,
      accountLabel: account.label,
      subledger: subledger.code,
      subledgerLabel: subledger.label,
      label: cellText(tds[2]),
      currency: cellText(tds[3]),
      exchangeRate: cellText(tds[4]),
      debit: debit.main,
      debitConverted: debit.converted,
      credit: credit.main,
      creditConverted: credit.converted,
      deleteHref: tr.querySelector('a[href*="action=confirm_delete"], a[href*="action=delete"]')?.getAttribute('href') ?? null,
    })
  }

  return {
    pieceNum: cellText(rows[0]?.cells[1]),
    mode: hidden.mode ?? mode,
    date: valueOf('action=editdate'),
    journal: valueOf('action=editjournal'),
    accountingDoc: valueOf('action=editdocref'),
    docType,
    creationDate,
    currencyLabel,
    lines,
    add,
    token: form?.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? '',
    hidden,
  }
}
