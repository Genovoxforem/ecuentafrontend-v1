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
function bodyRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.tBodies).flatMap((tb) => Array.from(tb.rows))
}

function footTotals(table: HTMLTableElement | null): { debit: number; credit: number } {
  const row = table?.tFoot?.rows[0]
  const cells = row ? Array.from(row.cells) : []
  return { debit: parseAmount(cellText(cells[7])), credit: parseAmount(cellText(cells[8])) }
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
