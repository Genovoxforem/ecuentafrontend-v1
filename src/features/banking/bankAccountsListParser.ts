// Parses compta/bank/list.php (Bank Management Details). Verified against the dev backend and the
// page's own PHP:
//   - `table#example`: one row per account, columns picked from the header `title`s — Bank accounts
//     (link `card.php?id=N`), Label, Type, Number, Accounting account, Accounting code journal,
//     Entries to reconcile, Status, Balance (further optional columns are ignored);
//   - Entries to reconcile is a numeric badge linking to the reconcile list (plus a red badge for
//     late entries) for accounts that can be reconciled, otherwise plain text ("Cash account",
//     "Closed", "Conciliation disabled");
//   - Balance is a link to the account's entries, formatted in the account's own currency;
//   - the page lists only OPEN accounts unless `search_status=closed|all`, and stops at `limit`.

export type BankAccountReconcile = { kind: 'count'; count: number; late: number } | { kind: 'text'; text: string }

export interface BankAccountListRow {
  id: string
  ref: string
  label: string
  type: string
  number: string
  accountingAccount: string
  journal: string
  toReconcile: BankAccountReconcile
  open: boolean
  statusLabel: string
  balance: number
  balanceText: string
}

const clean = (value: string | null | undefined) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

const HEADERS: Record<string, string> = {
  'bank accounts': 'ref',
  label: 'label',
  type: 'type',
  number: 'number',
  'accounting account': 'accountingAccount',
  'accounting code journal': 'journal',
  'entries to reconcile': 'reconcile',
  status: 'status',
  balance: 'balance',
}

// "-75.00 ZMW" -> -75, "$1,000.00" -> 1000
const toNumber = (text: string) => {
  const n = Number(text.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function parseBankAccountsList(doc: Document): BankAccountListRow[] {
  const table = doc.querySelector('table#example')
  if (!table) throw new Error('The bank accounts on this backend page were not recognised.')

  const column: Record<string, number> = {}
  Array.from(table.querySelectorAll('thead th')).forEach((th, i) => {
    const key = HEADERS[clean(th.getAttribute('title') || th.textContent).toLowerCase()]
    if (key) column[key] = i
  })
  if (column.ref === undefined || column.balance === undefined) throw new Error('The bank accounts on this backend page were not recognised.')

  const rows: BankAccountListRow[] = []
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll(':scope > td'))
    const id = cells[column.ref]?.querySelector('a[href*="card.php"]')?.getAttribute('href')?.match(/[?&]id=(\d+)/)?.[1]
    if (!id) return
    const text = (key: string) => clean(cells[column[key]]?.textContent)

    const reconcileCell = cells[column.reconcile]
    const countBadge = reconcileCell?.querySelector('a[href*="search_conciliated"] .badge')
    const lateBadge = reconcileCell?.querySelector('.badge-danger')
    const toReconcile: BankAccountReconcile = countBadge
      ? { kind: 'count', count: Number(clean(countBadge.textContent)) || 0, late: lateBadge ? Number(clean(lateBadge.textContent)) || 0 : 0 }
      : { kind: 'text', text: clean(reconcileCell?.textContent) }

    const statusLabel = text('status')
    rows.push({
      id,
      ref: text('ref'),
      label: text('label'),
      type: text('type'),
      number: text('number'),
      accountingAccount: text('accountingAccount'),
      journal: text('journal'),
      toReconcile,
      open: /open/i.test(statusLabel),
      statusLabel,
      balance: toNumber(text('balance')),
      balanceText: text('balance'),
    })
  })
  return rows
}
