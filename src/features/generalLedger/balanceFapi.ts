import { fapiGet } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { LegacyCell, LegacyTable } from './legacyTable'

// accountancy/fapi/balance.php (22 Oct 2026): one row per accounting account for the date range, with its opening balance, the period's
// debit and credit, the period balance and the closing balance, and the totals. Captured from newecuenta on 22 Oct 2026
// (tests/fixtures/accountancy-balance.json). Filters checked live: the date range (date_start / date_end), search_ledger_code (journal)
// and search_accountancy_code_start / _end all change the result. Since 23 Oct 2026 the documented `journal`, `account_start` and
// `account_end` filters work too (re-tested live), so the page offers a journal and an account range next to the date range.
export interface FapiBalance {
  accounts: Array<{ numero_compte: string; account_label: string; opening_balance: number; debit: number; credit: number; balance: number; closing_balance: number }>
  totals: { opening_balance: number; debit: number; credit: number; balance: number; closing_balance: number }
  filters: { date_start: string | null; date_end: string | null }
}

const cell = (text: string): LegacyCell => ({ text, href: null, checkId: null })

// The page sends its date range as three fields per date (…day / …month / …year); the endpoint takes ISO dates.
function isoFrom(params: Record<string, string>, prefix: string): string | undefined {
  const y = params[`${prefix}year`]
  const m = params[`${prefix}month`]
  const d = params[`${prefix}day`]
  return y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : undefined
}

const splitIso = (prefix: string, iso: string | null): Record<string, string> => {
  const [y, m, d] = (iso ?? '').split('-')
  return y && m && d ? { [`${prefix}year`]: y, [`${prefix}month`]: m.padStart(2, '0'), [`${prefix}day`]: d.padStart(2, '0') } : {}
}

// The same table the page showed (Accounting account / Debit / Credit / Balance, then a totals row), so the list page renders it as before.
export function mapBalanceFapi(data: FapiBalance): LegacyTable {
  return {
    headers: ['Accounting account', 'Debit', 'Credit', 'Balance'],
    filters: [null, null, null, null],
    rows: data.accounts.map((a) => [cell(`${a.numero_compte} - ${a.account_label}`), cell(formatMoney(a.debit)), cell(formatMoney(a.credit)), cell(formatMoney(a.balance))]),
    totals: [[cell('Total'), cell(formatMoney(data.totals.debit)), cell(formatMoney(data.totals.credit)), cell(formatMoney(data.totals.balance))]],
    // The range the backend applied, in the page's own day / month / year fields (it shows them in the date pickers).
    fields: { ...splitIso('date_start', data.filters.date_start), ...splitIso('date_end', data.filters.date_end) },
  }
}

export async function loadAccountBalance(params: Record<string, string>): Promise<LegacyTable> {
  return mapBalanceFapi(
    await fapiGet<FapiBalance>('/accountancy/fapi/balance.php', {
      date_start: isoFrom(params, 'date_start'),
      date_end: isoFrom(params, 'date_end'),
      journal: params.journal || undefined,
      account_start: params.account_start || undefined,
      account_end: params.account_end || undefined,
    }),
  )
}
