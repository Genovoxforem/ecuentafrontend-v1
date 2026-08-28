// Parses rows from fourn/commande/purchase_ajax_list.php — the real,
// working DataTables JSON endpoint behind fourn/commande/list.php (a
// separate namespace from the old dead /api/purchase-orders/* this app was
// built against). Same discipline as societeListParser.ts: every cell is
// server-built HTML (getNomUrl(), LibStatut(), price()), not a clean value —
// the exact structure per column below was read directly out of the real
// purchase_ajax_list.php PHP source, not guessed.
//
// Column keys are the odd DataTables names the PHP itself uses
// (product_ref/label/pricedet/desiredstock/realstock/virtualstock*) —
// kept as-is here rather than renamed, so this file stays directly
// comparable to the source it was read from.

export interface RawPurchaseOrderListRow {
  product_ref: string
  label: string
  pricedet: string
  desiredstock: string
  realstock: string
  virtualstock: string
  virtualstock1: string
  virtualstock2: string
  virtualstock3: string
  virtualstock4: string
  virtualstock5: string
}

export interface PurchaseOrderListRow {
  id: number | null
  ref: string
  refOrderVendor: string
  requestAuthor: string
  thirdPartyName: string
  socid: number | null
  city: string
  zipCode: string
  orderDate: string
  plannedDelivery: string
  amountExclTax: number
  statusLabel: string
  statusCode: number | null
  billed: boolean
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

// product_ref: CommandeFournisseur::getNomUrl(1, '', 0, -1, 1) — read
// directly from that function's real source (fourn/class/
// fournisseur.commande.class.php) — plus a document-download icon link and
// an inert inline <script>. The order id comes from the href
// (".../fourn/commande/card.php?id=N..."); the ref is the <a>'s own text
// (the picto <img> contributes no textContent, so .textContent is safe here
// unlike the avatar-div case below).
function parseProductRef(html: string): { id: number | null; ref: string } {
  const root = parseFragment(html)
  const anchor = root.querySelector('a[href*="card.php?id="]')
  if (!anchor) return { id: null, ref: text(root) }
  const idMatch = anchor.getAttribute('href')?.match(/[?&]id=(\d+)/)
  return { id: idMatch ? Number(idMatch[1]) : null, ref: text(anchor) }
}

// desiredstock: '<div>' + Fournisseur(extends Societe)::getNomUrl(1,
// 'supplier') + '</div><small>{name_alias}</small>' — read directly from
// Societe::getNomUrl()'s real source. option='supplier' routes the href to
// fourn/card.php?socid=N (not societe/card.php). withpicto=1 prepends an
// avatar <div class="avatar-circle">INITIALS</div> before the name whose own
// text must be excluded from the name, same fix documented in
// societeListParser.ts's parseCustName for the identical getNomUrl() pattern.
function parseThirdParty(html: string): { socid: number | null; name: string } {
  const root = parseFragment(html)
  const anchor = root.querySelector('a[href*="socid="]')
  if (!anchor) return { socid: null, name: text(root) }
  const socidMatch = anchor.getAttribute('href')?.match(/socid=(\d+)/)
  const socid = socidMatch ? Number(socidMatch[1]) : null
  const name = Array.from(anchor.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim()
  return { socid, name: name || text(anchor) }
}

// virtualstock4: CommandeFournisseur::LibStatut($fk_statut, 5, $billed) —
// renders a badge whose text is one of these exact English labels (read
// directly from langs/en_US/orders.lang's StatusSupplierOrder* keys, long
// form — confirmed against a real billed=0 sample where the long and short
// forms differ, e.g. "All products received" vs. "Products received").
// Matched case-insensitively since dolGetStatus's badge markup can vary the
// wrapping element by theme/mode without changing this text. This is the
// only way to recover the raw status code — the AJAX response never
// exposes fk_statut directly, only this rendered label.
const STATUS_LABELS: Array<{ code: number; long: string }> = [
  { code: 0, long: 'draft (needs to be validated)' },
  { code: 1, long: 'validated' },
  { code: 2, long: 'approved' },
  { code: 3, long: 'ordered - standby reception' },
  { code: 4, long: 'partially received' },
  { code: 5, long: 'all products received' },
  { code: 6, long: 'canceled' },
  { code: 9, long: 'refused' },
]
export function parseStatusCode(label: string): number | null {
  const normalized = label
    .toLowerCase()
    .replace(/\s*-\s*billed$/, '')
    .trim()
  return STATUS_LABELS.find((s) => s.long === normalized)?.code ?? null
}

export function parsePurchaseOrderListRow(raw: RawPurchaseOrderListRow): PurchaseOrderListRow {
  const { id, ref } = parseProductRef(raw.product_ref)
  const { socid, name } = parseThirdParty(raw.desiredstock)
  const statusLabel = text(parseFragment(raw.virtualstock4))
  return {
    id,
    ref,
    refOrderVendor: raw.label ?? '',
    requestAuthor: text(parseFragment(raw.pricedet)),
    thirdPartyName: name,
    socid,
    city: raw.realstock ?? '',
    zipCode: raw.virtualstock ?? '',
    orderDate: raw.virtualstock1 ?? '',
    plannedDelivery: raw.virtualstock2 ?? '',
    amountExclTax: parseAmount(raw.virtualstock3 ?? ''),
    statusLabel,
    statusCode: parseStatusCode(statusLabel),
    billed: /^yes$/i.test((raw.virtualstock5 ?? '').trim()),
  }
}

// dol_print_date($ts, 'day') renders "MM/DD/YYYY" — parsed here (rather than
// passed through raw) so the "this month" stat can compare it against the
// current calendar month reliably across browsers.
export function parseUsDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, month, day, year] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}
