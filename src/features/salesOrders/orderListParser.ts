// Parses rows from commande/salesoredr_ajax_list.php — the real DataTables
// endpoint wired up by commande/list.php's own JS (the classic Dolibarr
// order list, not the "New Order" wizard at commande/salesorder/index_v2.php
// nor the small quick-search sidebar at commande/sales-order-list.php). The
// old app-level /api/orders/ and /api/orders/summary/ endpoints this feature
// used to call are a genuine 404 on this backend (checked live: Apache
// itself can't find a route, unlike /api/products/ or /api/customers/ which
// 401 for a missing API key) — this is the same "dead REST route, real
// legacy page" pattern already found for Warehouses/Inventory/Customers.
//
// Every cell is server-built HTML, and the column-to-field names are
// unusual — literal leftovers from a copy-pasted DataTables config, not what
// they sound like. Verified directly against salesoredr_ajax_list.php's own
// $data[] assignment (not guessed from a sample row):
//   cust_name    -> order ref link (commande/card.php?id=X)
//   currency     -> ref_client (customer's own PO/ref number), often null
//   labelcountry -> project ref link (an empty <a> when no project)
//   typent_code  -> third-party name + avatar-circle link — same markup as
//                   societeListParser's cust_name column, so the avatar
//                   div's own text has to be excluded the same way
//   contact      -> town, often null
//   cust_type    -> zip, often null
//   entity       -> order date, already formatted "MM/DD/YYYY"
//   date         -> planned delivery date, already formatted, often blank
//   tot_amount   -> total_ht, a plain numeric string (no currency suffix)
//   author       -> user login link
//   shippable    -> always a single space in the raw HTML: the shippable
//                   calculation block in salesoredr_ajax_list.php is gated
//                   on an undefined $show_shippable_command variable, so it
//                   never runs on this deployment — this stays a fixed
//                   false rather than a fabricated true/false split
//   billed       -> "Yes"/"No" plain text (Dolibarr's yn())
//   status       -> a <span class="badge ...">Label</span>

export interface RawOrderListRow {
  cust_name: string
  currency: string | null
  labelcountry: string
  typent_code: string
  contact: string | null
  cust_type: string | null
  entity: string
  date: string
  tot_amount: string
  author: string
  shippable: string
  billed: string
  status: string
}

export interface OrderListRow {
  id: number | null
  ref: string
  refCustomer: string
  projectRef: string
  thirdParty: string
  city: string
  zipCode: string
  orderDate: string
  plannedDelivery: string
  amountExclTax: number
  author: string
  billed: boolean
  statusLabel: string
}

function parseFragment(html: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  return wrapper
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(raw: string): number {
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function parseOrderRef(html: string): { id: number | null; ref: string } {
  const root = parseFragment(html)
  const anchor = root.querySelector('a[href*="card.php?id="]')
  if (!anchor) return { id: null, ref: text(root) }
  const idMatch = anchor.getAttribute('href')?.match(/[?&]id=(\d+)/)
  return { id: idMatch ? Number(idMatch[1]) : null, ref: text(anchor) }
}

// Same avatar-circle-exclusion shape as societeListParser.ts's parseCustName
// — the third-party's <a> contains a `<div class="avatar-circle">INITIALS</div>`
// sibling before the name's own text node, so only the anchor's direct text
// nodes are the real name.
function parseThirdParty(html: string): string {
  const root = parseFragment(html)
  const anchor = root.querySelector('a[href*="socid="]')
  if (!anchor) return text(root)
  const name = Array.from(anchor.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim()
  return name || text(anchor)
}

export function parseOrderListRow(raw: RawOrderListRow): OrderListRow {
  const { id, ref } = parseOrderRef(raw.cust_name)

  return {
    id,
    ref,
    refCustomer: raw.currency?.trim() ?? '',
    projectRef: text(parseFragment(raw.labelcountry ?? '')),
    thirdParty: parseThirdParty(raw.typent_code),
    city: raw.contact?.trim() ?? '',
    zipCode: raw.cust_type?.trim() ?? '',
    orderDate: raw.entity?.trim() ?? '',
    plannedDelivery: raw.date?.trim() ?? '',
    amountExclTax: parseAmount(raw.tot_amount ?? ''),
    author: text(parseFragment(raw.author ?? '')),
    billed: (raw.billed ?? '').trim().toLowerCase() === 'yes',
    statusLabel: text(parseFragment(raw.status ?? '')),
  }
}
