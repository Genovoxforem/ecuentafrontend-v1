// Types of the bankAccountsList page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// Parses compta/bank/list.php (Bank Management Details), per the page's own PHP:
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
