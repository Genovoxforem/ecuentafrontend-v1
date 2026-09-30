import { cellText } from './legacyTable'

// accountancy/bookkeeping/exchange_list.php ("Foreign currency revaluation for General ledger").
// A report, not a form: it lists ledger lines and revalues each one at today's exchange rate.
// From the page's own PHP and markup:
//   - filters: `search_currency_code`, the period as one text `newdatepicker` ("mm/dd/yyyy-mm/dd/yyyy",
//     split on "-"), `search_accountancy_code_end` (the account chosen is an upper bound) and an
//     "exchange revaluation date" (`exchange_date`) that the page itself then ignores — it always
//     revalues at today's rate;
//   - each line prints the entered amounts with the amount in the account currency below, then the
//     new amount at today's rate (with that rate below) and the unrealized gain/loss with an arrow
//     (green up = gain, red down = loss, amber = nothing).

export interface ExchangeRow {
  pieceNum: string
  journal: string
  date: string
  docRef: string
  account: string
  currency: string
  rate: string
  debit: string
  debitConverted: string
  credit: string
  creditConverted: string
  newAmount: string
  revaluationRate: string
  gainLoss: string
  trend: 'up' | 'down' | 'none'
}

export interface ExchangeOption {
  value: string
  label: string
}

export interface ExchangeList {
  // Header cells as the page prints them (amount headers name the currency).
  headers: string[]
  rows: ExchangeRow[]
  // Page totals for the debit and credit columns.
  totals: { debit: string; credit: string } | null
  filters: { currency: string; dateStart: string; dateEnd: string; account: string; exchangeDate: string }
  accountOptions: ExchangeOption[]
  limit: number
  limitOptions: number[]
  page: number
  hasPrev: boolean
  hasNext: boolean
  // "For the period of … To …" as the page prints it under its title.
  period: string
}

// "09/28/2026" -> "2026-09-28"
function usDateToIso(text: string): string {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(text)
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''
}

// "Conversion Amt : 2,500.00" -> "2,500.00"
const afterColon = (text: string) => text.replace(/^[^:]*:\s*/, '').trim()

// A cell of `amount<br><span>note : value</span>`.
function amountCell(td: Element | undefined): { main: string; note: string } {
  if (!td) return { main: '', note: '' }
  const copy = td.cloneNode(true) as Element
  const span = copy.querySelector('span')
  const note = afterColon(cellText(span))
  span?.remove()
  return { main: cellText(copy), note }
}

export function readExchangeList(doc: Document): ExchangeList {
  const table = doc.querySelector('table#excelPrint')
  const filterRow = table?.querySelector('tr.hideonexport')
  if (!table || !filterRow) throw new Error('The revaluation report on this backend page was not recognised.')

  const headerRow = filterRow.nextElementSibling
  const headers = Array.from(headerRow?.children ?? [], (th) => cellText(th))
  // Columns are found by their header (the shown columns can vary), not by position.
  const at = (label: RegExp) => headers.findIndex((h) => label.test(h))
  const col = { piece: at(/^num/i), date: at(/^date$/i), doc: at(/accounting doc/i), account: at(/^account$/i), currency: at(/^currency$/i), rate: at(/^exchange rate/i), debit: at(/^debit/i), credit: at(/^credit/i), now: at(/new accounting/i), gain: at(/unrealized/i) }
  if (Object.values(col).some((i) => i < 0)) throw new Error('The revaluation report on this backend page was not recognised.')

  const rows: ExchangeRow[] = []
  for (const tr of Array.from(table.querySelectorAll('tr.oddeven'))) {
    const tds = Array.from(tr.children)
    if (tds.length < headers.length) continue
    const first = cellText(tds[col.piece])
    const debit = amountCell(tds[col.debit])
    const credit = amountCell(tds[col.credit])
    const now = amountCell(tds[col.now])
    const gain = tds[col.gain]
    const arrow = gain.querySelector('i')?.className ?? ''
    rows.push({
      pieceNum: /piece_num=(\d+)/.exec(tds[col.piece].querySelector('a')?.getAttribute('href') ?? '')?.[1] ?? '',
      // "7-BQ": the transaction number, then the journal.
      journal: first.includes('-') ? first.slice(first.indexOf('-') + 1) : '',
      date: cellText(tds[col.date]),
      docRef: cellText(tds[col.doc]),
      account: cellText(tds[col.account]),
      currency: cellText(tds[col.currency]),
      rate: cellText(tds[col.rate]),
      debit: debit.main,
      debitConverted: debit.note,
      credit: credit.main,
      creditConverted: credit.note,
      newAmount: now.main,
      revaluationRate: now.note,
      gainLoss: cellText(gain),
      trend: /arrow-up/.test(arrow) ? 'up' : /arrow-down/.test(arrow) && /text-danger/.test(arrow) ? 'down' : 'none',
    })
  }

  const totalRow = table.querySelector('tr.liste_total')
  const totalCells = Array.from(totalRow?.children ?? [], (td) => cellText(td))

  const period = doc.querySelector('.sub_head')
  const limitSelect = doc.querySelector<HTMLSelectElement>('select#limit')
  const limitOptions = Array.from(limitSelect?.options ?? [], (o) => Number(cellText(o))).filter((n) => n > 0)
  const field = (name: string) => filterRow.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)
  const [start = '', end = ''] = (field('newdatepicker')?.value ?? '').split('-')
  const exchange = ['year', 'month', 'day'].map((part) => field(`exchange_date${part}`)?.value.trim() ?? '')

  return {
    headers,
    rows,
    totals: totalRow ? { debit: totalCells[col.debit] ?? '', credit: totalCells[col.credit] ?? '' } : null,
    filters: {
      currency: field('search_currency_code')?.value ?? '',
      dateStart: usDateToIso(start),
      dateEnd: usDateToIso(end),
      account: (() => {
        const value = (field('search_accountancy_code_end') as HTMLSelectElement | null)?.selectedOptions[0]?.value.trim() ?? ''
        return value === '-1' ? '' : value
      })(),
      exchangeDate: exchange.every(Boolean) ? `${exchange[0]}-${exchange[1].padStart(2, '0')}-${exchange[2].padStart(2, '0')}` : '',
    },
    accountOptions: Array.from(filterRow.querySelectorAll<HTMLOptionElement>('select[name="search_accountancy_code_end"] option'), (o) => ({ value: o.value.trim(), label: cellText(o) })).filter((o) => o.value && o.value !== '-1'),
    limit: Number(cellText(limitSelect?.selectedOptions[0])) || limitOptions[0] || 25,
    limitOptions,
    page: (Number(doc.querySelector<HTMLInputElement>('input[name="pageplusoneold"]')?.value) || 1) - 1,
    hasPrev: !!doc.querySelector('a.paginationprevious'),
    hasNext: !!doc.querySelector('a.paginationnext'),
    period: cellText(period).replace(/ /g, ' '),
  }
}
