import { cellText } from './legacyTable'

// accountancy/admin/openingbalance.php ("Opening Balances"). From the page's own PHP and markup:
//   - the form lists every account of the chart (`select#accounts_0`, option text
//     `<number>-<label>`), one debit and one credit box per row, and under the rows a fixed
//     "adjustment" account (constant ACCOUNTING_ACCOUNT_LEDGER_OPENING, a hidden `accounts[]` in
//     the footer) that receives the difference between the debit and credit totals;
//   - "Validate Transaction" posts the rows AND that adjustment row to openingbalance_ajax.php,
//     which writes them all under one new piece number, doc ref "Opening Balance"
//     (journal AC for a debit, VT for a credit) and answers `[{status: 200}]`.

export interface OpeningBalanceOption {
  value: string
  label: string
}

export interface OpeningBalanceForm {
  token: string
  // Currency of the debit / credit columns, from "Debit (ZMW)".
  currency: string
  accounts: OpeningBalanceOption[]
  // The account that holds the difference, with the page's own note about it.
  adjustment: { account: string; label: string; note: string }
}

export function readOpeningBalance(doc: Document): OpeningBalanceForm {
  const select = doc.querySelector<HTMLSelectElement>('select#accounts_0')
  const adjustment = doc.querySelector<HTMLInputElement>('input#accounts_500')
  if (!select || !adjustment) throw new Error('The opening balance form on this backend page was not recognised.')

  const cell = adjustment.closest('td')
  const copy = cell?.cloneNode(true) as Element | undefined
  const note = cellText(copy?.querySelector('div'))
  copy?.querySelector('div')?.remove()

  const debitHeader = Array.from(doc.querySelectorAll('#accountstable th'), (th) => cellText(th)).find((t) => /^debit/i.test(t)) ?? ''

  return {
    token: doc.querySelector<HTMLInputElement>('form#openingvalidationForm input[name="token"], input[name="token"]')?.value ?? '',
    currency: /\((.+)\)/.exec(debitHeader)?.[1] ?? '',
    accounts: Array.from(select.querySelectorAll('option'), (o) => ({ value: o.value.trim(), label: cellText(o) })).filter((o) => o.value && o.value !== '-1'),
    adjustment: { account: adjustment.value, label: cellText(copy), note },
  }
}
