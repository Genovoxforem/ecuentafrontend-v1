// Parses the legacy Dolibarr accounting pages (Ledger "view by account" and
// Journals) client-side — there is no REST API for bookkeeping data (see
// generalLedger.queries.ts), only these PHP-rendered HTML pages. The exact
// selectors/column order below were reverse-engineered against real fetched
// HTML from the live local backend (both pages render the SAME table class,
// "table.ledger-table", which is otherwise unique per page) — not guessed
// from screenshots. If Dolibarr's template changes, these will need
// re-verifying the same way.

export interface LedgerRow {
  transactionNum: string
  cardUrl: string | null
  journal: string
  date: string
  accountingDoc: string
  label: string
  currencyCode: string
  conversionAmount: string
  exchangeRate: string
  debit: number
  credit: number
}

export interface LedgerAccountGroup {
  accountCode: string
  accountLabel: string
  rows: LedgerRow[]
  totalDebit: number
  totalCredit: number
  balance: number
  balanceSide: 'Dr' | 'Cr' | null
}

export interface LedgerMovement {
  debit: number
  credit: number
  balance: number
  balanceSide: 'Dr' | 'Cr'
}

export interface LedgerReport {
  groups: LedgerAccountGroup[]
  grandTotalDebit: number
  grandTotalCredit: number
  periodMovements: LedgerMovement | null
  closingBalance: LedgerMovement | null
}

export interface JournalRow {
  transactionNum: string
  cardUrl: string | null
  journal: string
  date: string
  accountingDoc: string
  accountCode: string
  subledgerAccount: string
  label: string
  debit: number
  credit: number
  dateExport: string
}

export interface JournalsReport {
  rows: JournalRow[]
  totalDebit: number
  totalCredit: number
}

function cellText(cell: Element | undefined): string {
  return (cell?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(text: string): number {
  const cleaned = text.replace(/,/g, '').trim()
  if (!cleaned) return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

// The "Conversion Amount" column mashes two stacked lines from the source
// markup into one text node, e.g. "100.00Exchange Rate : 0.0000" (foreign
// currency) or just "Exchange Rate :" (base currency ZMW, no rate shown).
function splitConversion(text: string): { conversionAmount: string; exchangeRate: string } {
  const m = /^([\d,.]*)\s*Exchange Rate\s*:\s*([\d.]*)$/i.exec(text)
  return { conversionAmount: m?.[1] ?? '', exchangeRate: m?.[2] ?? '' }
}

const ACCOUNT_HEADER_RE = /^(\d[\d.]*)\s*:\s*(.+)$/

function bodyRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.tBodies).flatMap((tb) => Array.from(tb.rows))
}

function footTotals(table: HTMLTableElement | null): { debit: number; credit: number } {
  const row = table?.tFoot?.rows[0]
  const cells = row ? Array.from(row.cells) : []
  return { debit: parseAmount(cellText(cells[7])), credit: parseAmount(cellText(cells[8])) }
}

function parseMovementRow(tr: Element): LedgerMovement {
  const cells = Array.from(tr.querySelectorAll('td'))
  const debit = parseAmount(cellText(cells[1]).replace(/^debit:/i, ''))
  const credit = parseAmount(cellText(cells[2]).replace(/^credit:/i, ''))
  const balanceText = cellText(cells[3])
  const balanceSide: 'Dr' | 'Cr' = /cr\b/i.test(balanceText) ? 'Cr' : 'Dr'
  const balance = parseAmount(balanceText.replace(/dr|cr/gi, ''))
  return { debit, credit, balance, balanceSide }
}

export function parseLedgerDocument(doc: Document): LedgerReport {
  const table = doc.querySelector<HTMLTableElement>('table.ledger-table')
  const groups: LedgerAccountGroup[] = []
  let current: LedgerAccountGroup | null = null

  if (table) {
    for (const tr of bodyRows(table)) {
      const cls = tr.className || ''
      const cells = Array.from(tr.cells)

      if (cls.includes('oddeven')) {
        if (!current) continue
        const link = cells[0]?.querySelector('a')
        current.rows.push({
          transactionNum: cellText(cells[0]),
          cardUrl: link?.getAttribute('href') ?? null,
          journal: cellText(cells[1]),
          date: cellText(cells[2]),
          accountingDoc: cellText(cells[3]),
          label: cellText(cells[4]),
          currencyCode: cellText(cells[5]),
          ...splitConversion(cellText(cells[6])),
          debit: parseAmount(cellText(cells[7])),
          credit: parseAmount(cellText(cells[8])),
        })
        continue
      }

      if (cls.includes('totalRow')) {
        if (!current) continue
        const label = cellText(cells[0])
        if (/^total for/i.test(label)) {
          current.totalDebit = parseAmount(cellText(cells[1]))
          current.totalCredit = parseAmount(cellText(cells[2]))
        } else if (/^balance/i.test(label)) {
          const debitSlot = cellText(cells[1])
          const creditSlot = cellText(cells[2])
          if (debitSlot) {
            current.balance = parseAmount(debitSlot)
            current.balanceSide = 'Dr'
          } else if (creditSlot) {
            current.balance = parseAmount(creditSlot)
            current.balanceSide = 'Cr'
          }
        }
        continue
      }

      // Section-header row: a single cell reading "<account code> : <label>".
      if (cells.length <= 2) {
        const m = ACCOUNT_HEADER_RE.exec(cellText(tr))
        if (m) {
          if (current) groups.push(current)
          current = { accountCode: m[1], accountLabel: m[2], rows: [], totalDebit: 0, totalCredit: 0, balance: 0, balanceSide: null }
        }
      }
    }
    if (current) groups.push(current)
  }

  const { debit: grandTotalDebit, credit: grandTotalCredit } = footTotals(table)

  const summaryRows = Array.from(doc.querySelectorAll('.info-box table tbody tr'))
  const periodMovements = summaryRows[0] ? parseMovementRow(summaryRows[0]) : null
  const closingBalance = summaryRows[1] ? parseMovementRow(summaryRows[1]) : null

  return { groups, grandTotalDebit, grandTotalCredit, periodMovements, closingBalance }
}

export function parseJournalsDocument(doc: Document): JournalsReport {
  const table = doc.querySelector<HTMLTableElement>('table.ledger-table')
  const rows: JournalRow[] = []

  if (table) {
    for (const tr of bodyRows(table)) {
      if (!tr.className.includes('oddeven')) continue
      const cells = Array.from(tr.cells)
      const link = cells[0]?.querySelector('a')
      rows.push({
        transactionNum: cellText(cells[0]),
        cardUrl: link?.getAttribute('href') ?? null,
        journal: cellText(cells[1]),
        date: cellText(cells[2]),
        accountingDoc: cellText(cells[3]),
        accountCode: cellText(cells[4]),
        subledgerAccount: cellText(cells[5]),
        label: cellText(cells[6]),
        debit: parseAmount(cellText(cells[7])),
        credit: parseAmount(cellText(cells[8])),
        dateExport: cellText(cells[9]),
      })
    }
  }

  const { debit: totalDebit, credit: totalCredit } = footTotals(table)
  return { rows, totalDebit, totalCredit }
}

// The DOLSESSID cookie from establishLegacySession (legacySession.ts) is
// best-effort and never throws — if it's missing or expired, the legacy
// backend silently redirects to its own login page instead of the report,
// and table.ledger-table simply won't exist.
export function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.querySelector('table.ledger-table') && !!doc.querySelector('input[name="password"]')
}
