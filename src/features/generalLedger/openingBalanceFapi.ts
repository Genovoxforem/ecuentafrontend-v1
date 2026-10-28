export interface OpeningBalanceOption {
  value: string
  label: string
}

// The "Opening Balances" wizard (classic accountancy/admin/openingbalance.php): the rows are saved together with an
// adjustment row on the fixed account (ACCOUNTING_ACCOUNT_LEDGER_OPENING) that receives the difference between the
// debit and credit totals.
export interface OpeningBalanceForm {
  token: string
  // Currency of the debit / credit columns.
  currency: string
  accounts: OpeningBalanceOption[]
  // The account that holds the difference, with the backend's own note about it.
  adjustment: { account: string; label: string; note: string }
}

// accountancy/fapi/opening_balance.php (22 Oct 2026): the wizard's data (currency, the account that holds the difference, the whole chart for
// the account picker, and any existing "Opening Balance" rows) and, on POST, the save under one new transaction number. Field names are the
// ones captured from newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-opening-balance.json).
export interface FapiOpeningBalance {
  currency: string
  adjustment: { account: string; label: string; note: string }
  accounts: Array<{ account_number: string; label: string }>
  current: unknown[]
  current_totals: { debit: number; credit: number; balance: number }
}

export function mapOpeningBalanceFapi(d: FapiOpeningBalance): OpeningBalanceForm {
  return {
    // The endpoint needs no form token.
    token: '',
    currency: d.currency,
    accounts: d.accounts.map((a) => ({ value: a.account_number, label: `${a.account_number}-${a.label}` })),
    adjustment: { account: d.adjustment.account, label: `${d.adjustment.account} - ${d.adjustment.label}`, note: d.adjustment.note },
  }
}

export interface OpeningBalanceLine {
  account: string
  debit: string
  credit: string
}

// The page already adds its own balancing line, so the lines are sent exactly as built and auto_adjust is off: the endpoint then checks
// that they balance (422 "Opening balance is not balanced" otherwise) instead of appending a second adjustment.
export function openingBalanceBody(date: string, lines: OpeningBalanceLine[]) {
  return { date, auto_adjust: false, lines: lines.map((l) => ({ account: l.account, debit: l.debit || '0', credit: l.credit || '0' })) }
}
