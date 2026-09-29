import { cellText } from './legacyTable'

// accountancy/admin/card.php?id=N ("Accounting account - Card"). From the page's own PHP and markup:
//   - the view prints a status under the banner ("Enabled"), a table of label / value rows (Label,
//     Short label, Parent account as "number - label", Personalized groups, Group of account) and
//     the Modify and Delete buttons — a user without the right gets a refused, inert button instead;
//   - both buttons are links carrying the page's token; Delete deletes at once (no confirmation on
//     the page) and the backend then opens the account list;
//   - the account number is not on the view at all, only in the edit form (`action=update`).

export interface AccountCard {
  // "Enabled" / "Disabled" as the page prints it.
  status: string
  rows: { label: string; value: string }[]
  canModify: boolean
  // Root-relative delete link (with the token), null when the user may not delete.
  deleteHref: string | null
}

export function readAccountCard(doc: Document): AccountCard {
  const table = doc.querySelector('.fichecenter table.newCustomUItable')
  if (!doc.querySelector('a#card') || !table) throw new Error('This accounting account was not found on the backend.')
  const rows = Array.from(table.querySelectorAll('tr'))
    .map((tr) => ({ label: cellText(tr.children[0]), value: cellText(tr.children[1]) }))
    .filter((r) => r.label)
  return {
    status: cellText(doc.querySelector('.subTitle')),
    rows,
    canModify: !!doc.querySelector('.tabsAction a.butAction[href*="action=update"]'),
    deleteHref: doc.querySelector('.tabsAction a.butActionDelete[href*="action=delete"]')?.getAttribute('href') ?? null,
  }
}
