import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { loadSubscriptionStats, loadSubscriptionsTable, loadTypesTable } from './membersApi.data'

// The Members pages that have no JSON API (newecuenta's adherents/fapi has only list.php) are read from the classic pages with a GET, as the
// pages print them. 5.10 has no Members module, so newecuenta's classic pages are the reference. Real markup seen on 6 Nov 2026:
//   - adherents/type.php and adherents/subscription/list.php: `table#example`, a `thead` of `th`, one `tbody tr` per row (the type row is
//     "1 | <label> | Moral and Physical | Yes | No | Open | <empty actions cell>");
//   - adherents/index.php: four `table.adh-table` inside `.card` blocks whose `.card-header h6` is the title ("Latest 3 modified members",
//     "Latest 3 modified subscriptions" ...); an empty block has one row "None" spanning every column; the Total row holds the sums;
//     the status of a member is a badge with no text and a `title` ("Draft (needs to be validated)");
//   - adherents/stats/*.php: the first `tr` of a `table.newCustomUItable` / `table-bordered` holds the headers (as `td`), the rows follow it; a
//     `div` above it says "No validated members found" when there is nothing; the Subscriptions page also draws two charts (not built).
// Rows of the statistics pages could only be seen as headers + the "Physical" / "Moral" rows of By nature: no member has a subscription
// on newecuenta, so the rows with values are shown exactly as the page prints their cells.
export const MEMBER_PAGES = {
  types: '/adherents/type.php',
  subscriptions: '/adherents/subscription/list.php',
  area: '/adherents/index.php',
  statsSubscriptions: '/adherents/stats/index.php',
  statsCountry: '/adherents/stats/geo.php?mode=memberbycountry',
  statsRegion: '/adherents/stats/geo.php?mode=memberbyregion',
  statsState: '/adherents/stats/geo.php?mode=memberbystate',
  statsTown: '/adherents/stats/geo.php?mode=memberbytown',
  statsNature: '/adherents/stats/byproperties.php',
} as const

export interface MemberTable {
  title: string
  headers: string[]
  rows: string[][]
  // The one-cell row a table prints when it is empty ("None"); '' when there is none.
  emptyNote: string
  // The line printed above a statistics table ("No validated members found"); '' when there is none.
  message: string
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

// A cell's text; a status badge has no text, its title says what it is.
export function memberCellText(cell: Element, allowBadgeTitle = true): string {
  const text = clean(cell.textContent)
  if (text || !allowBadgeTitle) return text
  return clean(cell.querySelector('[title]')?.getAttribute('title') ?? cell.querySelector('[aria-label]')?.getAttribute('aria-label'))
}

// "No validated members found": the geo pages print it as a bare text node above the table, By nature as a `div`. Only a line that starts
// with "No" is taken, so the page's tab links are never read as a message.
function messageAbove(holder: Element | null): string {
  for (let n: ChildNode | null = holder?.previousSibling ?? null; n; n = n.previousSibling) {
    // The country page has its map script (and comments) between the text and the table.
    if (n.nodeType === 8 || (n instanceof Element && /^(SCRIPT|STYLE)$/.test(n.tagName))) continue
    const text = clean(n.textContent)
    if (!text) continue
    return /^No\b/.test(text) && !(n instanceof Element && n.querySelector('table')) ? text : ''
  }
  return ''
}

export function readMemberTables(doc: Document): MemberTable[] {
  const root = doc.querySelector('#id-right') ?? doc.body
  const tables: MemberTable[] = []
  for (const table of Array.from(root.querySelectorAll('table'))) {
    if (table.querySelector('table') || table.closest('#bellNotification')) continue
    const trs = Array.from(table.querySelectorAll('tr'))
    const headRow = table.querySelector('thead tr') ?? trs[0]
    const headers = Array.from(headRow?.children ?? []).map((h) => memberCellText(h))
    // A layout table (the charts' frame, the page's tabs) has no header row of at least two cells.
    if (headers.length < 2 || headers.every((h) => !h)) continue
    const rows: string[][] = []
    let emptyNote = ''
    for (const tr of trs) {
      if (tr === headRow) continue
      const cells = Array.from(tr.children)
      if (cells.length === 0) continue
      if (cells.length === 1) {
        emptyNote = memberCellText(cells[0])
        continue
      }
      // A badge with no text names a status in a "Status" column; in a count column it is only the dot printed beside a 0 (by-type table).
      rows.push(cells.slice(0, headers.length).map((c, i) => memberCellText(c, /status/i.test(headers[i] ?? ''))))
    }
    tables.push({
      title: clean(table.closest('.card')?.querySelector('.card-header')?.textContent),
      headers,
      rows,
      emptyNote,
      message: messageAbove(table.closest('.div-table-responsive, .div-table-responsive-no-min')),
    })
  }
  return tables
}

export function useMemberTables(path: string) {
  return useQuery({
    queryKey: ['members', 'classic', path],
    // types, subscriptions and the subscription statistics come from adherents/fapi (membersApi.data.ts); the other pages are still read from the classic page
    queryFn: async (): Promise<MemberTable[]> =>
      path === MEMBER_PAGES.types
        ? loadTypesTable()
        : path === MEMBER_PAGES.subscriptions
          ? loadSubscriptionsTable()
          : path === MEMBER_PAGES.statsSubscriptions
            ? loadSubscriptionStats()
            : readMemberTables(await fetchLegacyDocument(path)),
    staleTime: 1000 * 30,
  })
}
