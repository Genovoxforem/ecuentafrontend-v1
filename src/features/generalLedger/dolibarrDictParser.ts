// Shared parser for Dolibarr's generic "dictionary" list template — the
// exact same markup (tr.oddeven rows, td.tddict data cells, a status
// toggle + edit + delete link per row, each carrying its own real CSRF
// token) backs admin/dict.php?id=<n> AND several accountancy-specific
// clones of that same template (journals_list.php, categories_list.php) —
// confirmed live this session by diffing Tax Accounts (dict.php?id=7),
// VAT Accounts (id=10), Expense Report Accounts (id=17), Personalized
// Groups (categories_list.php?id=32), and Accounting Journals
// (journals_list.php?id=35): identical row/cell/link shape, only the
// column count and dictionary id differ. Only Enable/Disable and Delete
// are wired here (both are simple, already-tokened GET links scraped
// straight off each row) — Add/Edit are real classic form-POSTs too, but
// each dictionary's own field set differs enough (Code/Label/Nature for
// journals vs Code/Label/Country/Accounting Code/Deductible for tax
// types, etc.) that reproducing them all generically is out of scope here.
export interface DictRow {
  rowid: string
  cells: string[]
  active: boolean
  toggleUrl: string | null
  deleteUrl: string | null
}

function absolutize(href: string): string {
  return href.startsWith('http') ? new URL(href).pathname + new URL(href).search : href
}

export function parseDictRows(html: string): DictRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rows = Array.from(doc.querySelectorAll<HTMLTableRowElement>('tr.oddeven'))
  return rows
    .map((tr) => {
      const cells = Array.from(tr.querySelectorAll('td.tddict')).map((td) => (td.textContent ?? '').trim())
      const disableLink = tr.querySelector<HTMLAnchorElement>('a[href*="action=disable"]')
      const enableLink = tr.querySelector<HTMLAnchorElement>('a[href*="action=enable"]')
      const deleteLink = tr.querySelector<HTMLAnchorElement>('a[href*="action=delete"]')
      const toggleHref = (disableLink ?? enableLink)?.getAttribute('href') ?? null
      const deleteHref = deleteLink?.getAttribute('href') ?? null
      return {
        rowid: tr.id.replace('rowid-', ''),
        cells,
        active: !!disableLink,
        toggleUrl: toggleHref ? absolutize(toggleHref) : null,
        deleteUrl: deleteHref ? absolutize(deleteHref) : null,
      }
    })
    .filter((r) => r.cells.length > 0)
}
