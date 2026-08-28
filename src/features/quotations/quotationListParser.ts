// Parses rows from comm/propal/quotation_ajax_list.php — the real, working
// DataTables JSON endpoint behind comm/propal/list.php (unrelated to the old
// dead local-only collection this replaces — no REST route named
// "quotations"/"propals" ever existed under /api/*, but this custom
// DataTables endpoint is real and live). Unlike purchase_ajax_list.php's odd
// virtualstockN keys, this one uses clean, self-describing field names —
// read directly from the real PHP source, not guessed.

export interface RawQuotationListRow {
  ref: string
  ref_customer: string
  ref_project: string
  third_party: string
  city: string
  zip_code: string
  date: string
  end_date: string
  amt_excl: string
  author: string
  sale_representative: string
  status: string
}

export interface QuotationListRow {
  id: number | null
  ref: string
  refCustomer: string
  projectRef: string
  thirdPartyName: string
  socid: number | null
  city: string
  zipCode: string
  date: string
  endDate: string
  amountExclTax: number
  author: string
  salesRep: string
  statusLabel: string
  statusCode: number | null
  // Real, live status signals carried alongside the ref link — read
  // directly from quotation_ajax_list.php's own construction of this cell
  // (img_warning() + FormFile::getDocumentsLink()), not derived/guessed.
  isLate: boolean
  documentUrl: string | null
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

// `ref`: a <td> wrapping Propal::getNomUrl(1, '', '', 0, 1, ...), then —
// only when the proposal is Validated and its validity date has passed the
// configured warning delay — img_warning("Late") (a
// `<div class="imglatecoin">` wrapping an <img alt/title="Late">, read
// directly from img_warning()'s real source), then — only when a real PDF
// has actually been generated for this ref —
// FormFile::getDocumentsLink()'s own `<div class="dropdown">` containing a
// `<a title="Download PDF" href="/document.php?...">` (read directly from
// that method's real source; it returns an empty string when no file
// exists, which is why most rows show neither icon at all).
function parseRef(html: string): { id: number | null; ref: string; isLate: boolean; documentUrl: string | null } {
  const root = parseFragment(html)
  const anchor = root.querySelector('a[href*="card.php?id="]')
  const idMatch = anchor?.getAttribute('href')?.match(/[?&]id=(\d+)/)
  const isLate = !!root.querySelector('.imglatecoin')
  const downloadLink = root.querySelector('a[title="Download PDF"]')
  return {
    id: idMatch ? Number(idMatch[1]) : null,
    ref: anchor ? text(anchor) : text(root),
    isLate,
    documentUrl: downloadLink?.getAttribute('href') ?? null,
  }
}

// `third_party`: Societe::getNomUrl(1, 'customer') — option='customer' routes
// the href to comm/card.php?socid=N (read directly from Societe::getNomUrl's
// real source, same function already relied on elsewhere in this app).
// withpicto=1 prepends an avatar <div class="avatar-circle">INITIALS</div>
// whose own text must be excluded from the name — same fix documented in
// societeListParser.ts/purchaseOrderListParser.ts for this identical
// pattern.
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

// `status`: Propal::LibStatut($fk_statut, 5) — mode 5 renders the SHORT
// label for this class (unlike CommandeFournisseur::LibStatut, which uses
// the long form at the same mode number — confirmed by reading both classes
// directly, not assumed identical). Labels read from langs/en_US/propal.lang.
const STATUS_LABELS: Array<{ code: number; short: string }> = [
  { code: 0, short: 'draft' },
  { code: 1, short: 'validated (open)' },
  { code: 2, short: 'signed' },
  { code: 3, short: 'not signed' },
  { code: 4, short: 'billed' },
]
export function parseStatusCode(label: string): number | null {
  const normalized = label.toLowerCase().trim()
  return STATUS_LABELS.find((s) => s.short === normalized)?.code ?? null
}

export function parseQuotationListRow(raw: RawQuotationListRow): QuotationListRow {
  const { id, ref, isLate, documentUrl } = parseRef(raw.ref)
  const { socid, name } = parseThirdParty(raw.third_party)
  const statusLabel = text(parseFragment(raw.status))
  return {
    id,
    ref,
    isLate,
    documentUrl,
    refCustomer: raw.ref_customer ?? '',
    projectRef: text(parseFragment(raw.ref_project)),
    thirdPartyName: name,
    socid,
    city: raw.city ?? '',
    zipCode: raw.zip_code ?? '',
    date: raw.date ?? '',
    endDate: raw.end_date ?? '',
    amountExclTax: parseAmount(raw.amt_excl ?? ''),
    author: text(parseFragment(raw.author)),
    salesRep: text(parseFragment(raw.sale_representative)),
    statusLabel,
    statusCode: parseStatusCode(statusLabel),
  }
}

export function parseUsDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, month, day, year] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}
