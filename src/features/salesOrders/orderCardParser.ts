// Parses commande/card.php?id=X — a classic server-rendered Dolibarr page
// (unlike societe/card.php, this custom install never gave sales orders a
// JSON API: commande/salesorder/api/order_handler.php only has create-flow
// actions — create/validate/calculate/add_line/delete_line/etc, confirmed
// by reading that file directly — nothing for reading an existing order).
// Same scrape-the-real-page pattern as Ledger/Warehouse elsewhere in this
// app. Selectors below were verified against a real fetched page (order
// id=103), not guessed.
//
// This page's own "Item Table" (the modern product-line grid, driven by a
// client-side OrderManager component) never populates existing lines when
// viewing an already-created order — confirmed live: no line rows are
// server-rendered, and no AJAX call loads them either (order_handler.php's
// only GET-style action is search_products, for the add-line autocomplete).
// So per-line product/qty/price detail genuinely isn't available from this
// page for an existing order — only the order's own already-aggregated
// totals are (real llx_commande.total_ht/tva/ttc columns). This parser
// exposes exactly that real header+totals data and honestly omits lines
// rather than fabricating a table with nothing behind it.

export interface OrderDetail {
  id: number
  ref: string
  refCustomer: string
  statusLabel: string
  statusBadgeNumber: number | null
  thirdPartyName: string
  thirdPartySocid: number | null
  projectRef: string
  projectLabel: string
  projectId: number | null
  orderDate: string
  plannedDelivery: string
  shippingMethod: string
  paymentTerms: string
  paymentType: string
  currencyLabel: string
  availabilityDelay: string
  channel: string
  incoterms: string
  bankAccountLabel: string
  discountNote: string
  totalHt: number
  totalVat: number
  totalTtc: number
  cloneUrl: string
  deleteUrl: string
}

function stripTags(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// The info table (Date/Shipping method/Payment Terms/.../BankAccount) has
// broken tag nesting in the raw source (a <div class="row"> opened inside a
// <td> closes with </td> before its own </div>) — browsers auto-correct
// this per HTML5 parsing rules, but the corrected DOM tree doesn't reliably
// match the source's apparent structure, so CSS-selector extraction on this
// section is fragile. Working on the raw HTML text directly instead: each
// row's real value is always its row's LAST <td>...</td>, after the label
// and edit-icon cells.
//
// Locating each row by its LABEL TEXT (e.g. "Currency") is unreliable on
// this specific page — confirmed live: this page embeds several unrelated
// modal templates (a company-settings panel, a bank-account form) that
// reuse the exact same common label words, so a plain text search can land
// on the wrong occurrence and silently extract nothing. Each row's edit-icon
// link carries the real Dolibarr action name instead (action=editdate,
// action=editmulticurrencycode, etc.) — confirmed unique across the whole
// page — so rows are located by that instead.
function findRowValueByAction(html: string, action: string): string {
  const anchorIdx = html.indexOf(`action=${action}`)
  if (anchorIdx === -1) return ''
  const trStart = html.lastIndexOf('<tr', anchorIdx)
  const trEnd = html.indexOf('</tr>', anchorIdx)
  if (trStart === -1 || trEnd === -1) return ''
  const rowHtml = html.slice(trStart, trEnd)
  const tdMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
  if (tdMatches.length === 0) return ''
  return stripTags(tdMatches[tdMatches.length - 1][1])
}

// Ref/Ref. customer render as "<label>...</label> <a editlink></a> : VALUE<br>"
// — a different (well-formed) shape from the info-table rows above.
function findInlineLabelValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`>${escaped}<\\/label>[\\s\\S]*?<\\/a>\\s*:\\s*([^<]*)<br>`)
  const m = re.exec(html)
  return (m?.[1] ?? '').trim()
}

function parseAmount(raw: string): number {
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

export function parseOrderCardHtml(html: string, id: number): OrderDetail {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const ref = findInlineLabelValue(html, 'Ref.')
  const refCustomer = findInlineLabelValue(html, 'Ref. customer')

  // Third-party name: the anchor's own direct text nodes only — its avatar
  // <div> child (initials, e.g. "BI") has its own text that would otherwise
  // get prepended to the name if read via a plain tag-strip (same pitfall
  // already handled in societeListParser.ts's parseCustName).
  let thirdPartyName = ''
  let thirdPartySocid: number | null = null
  const socidMatch = html.match(/societe\/card\.php\?socid=(\d+)"[^>]*class="[^"]*refurl/)
  if (socidMatch) {
    thirdPartySocid = Number(socidMatch[1])
    const anchor = doc.querySelector(`a[href*="societe/card.php?socid=${thirdPartySocid}"].refurl`)
    if (anchor) {
      thirdPartyName = Array.from(anchor.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim()
    }
  }

  let projectRef = ''
  let projectLabel = ''
  let projectId: number | null = null
  const projectMatch = html.match(/projet\/card\.php\?id=(\d+)">([^<]*)<\/a>\s*-\s*([^<]*)</)
  if (projectMatch) {
    projectId = Number(projectMatch[1])
    projectRef = projectMatch[2].trim()
    projectLabel = projectMatch[3].trim()
  }

  let statusLabel = ''
  let statusBadgeNumber: number | null = null
  const statusEl = doc.querySelector('.subTitle .badge-status')
  if (statusEl) {
    statusLabel = (statusEl.textContent ?? '').trim()
    const classMatch = (statusEl.getAttribute('class') ?? '').match(/badge-status(\d+)/)
    statusBadgeNumber = classMatch ? Number(classMatch[1]) : null
  }

  const totalHt = parseAmount(stripTags(doc.querySelector('.totHt_card')?.innerHTML ?? ''))
  const totalVat = parseAmount(stripTags(doc.querySelector('.totvat_card')?.innerHTML ?? ''))
  const totalTtc = parseAmount(stripTags(doc.querySelector('.totTTC_card')?.innerHTML ?? ''))

  const discountMatch = html.match(/Discounts<\/td><td>([\s\S]*?)<\/td>\s*<\/tr>/)
  const discountNote = discountMatch ? stripTags(discountMatch[1]) : ''

  const cloneMatch = html.match(/href="([^"]*action=clone[^"]*)"/)
  const deleteMatch = html.match(/href="([^"]*action=delete[^"]*)"/)

  return {
    id,
    ref,
    refCustomer,
    statusLabel,
    statusBadgeNumber,
    thirdPartyName,
    thirdPartySocid,
    projectRef,
    projectLabel,
    projectId,
    orderDate: findRowValueByAction(html, 'editdate&'),
    plannedDelivery: findRowValueByAction(html, 'editdate_livraison'),
    shippingMethod: findRowValueByAction(html, 'editshippingmethod'),
    paymentTerms: findRowValueByAction(html, 'editconditions'),
    paymentType: findRowValueByAction(html, 'editmode&'),
    currencyLabel: findRowValueByAction(html, 'editmulticurrencycode'),
    availabilityDelay: findRowValueByAction(html, 'editavailability'),
    channel: findRowValueByAction(html, 'editdemandreason'),
    incoterms: findRowValueByAction(html, 'editincoterm&'),
    bankAccountLabel: findRowValueByAction(html, 'editbankaccount'),
    discountNote,
    totalHt,
    totalVat,
    totalTtc,
    cloneUrl: (cloneMatch?.[1] ?? '').replace(/&amp;/g, '&'),
    deleteUrl: (deleteMatch?.[1] ?? '').replace(/&amp;/g, '&'),
  }
}

// note.php: "Note (public)"/"Note (private)" labels followed by a sibling
// content <div class="tagtdremove ... sensiblehtmlcontent">...</div>.
export interface OrderNotes {
  notePublic: string
  notePrivate: string
}

function findNoteContent(doc: Document, label: string): string {
  const labelEl = Array.from(doc.querySelectorAll('label.form-label')).find((el) => el.textContent?.trim() === label)
  const container = labelEl?.closest('.tagtd, .row')?.parentElement
  const contentEl = container?.querySelector('.tagtdremove.sensiblehtmlcontent, .tagtdremove')
  return (contentEl?.textContent ?? '').trim()
}

export function parseOrderNotesHtml(html: string): OrderNotes {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return {
    notePublic: findNoteContent(doc, 'Note (public)'),
    notePrivate: findNoteContent(doc, 'Note (private)'),
  }
}

// document.php: real file list in table#tablelines (Documents/Size/Date
// columns) — a placeholder single row with "No documents uploaded" when
// empty (confirmed live, order id=103 has none).
export interface OrderDocumentRow {
  name: string
  url: string
  size: string
  date: string
}

export function parseOrderDocumentsHtml(html: string): OrderDocumentRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rows = Array.from(doc.querySelectorAll('table#tablelines tr')).filter((r) => !r.classList.contains('liste_titre'))
  const result: OrderDocumentRow[] = []
  for (const row of rows) {
    const link = row.querySelector('a[href*="document.php"], a[href*="documents.php"]')
    if (!link) continue // the "No documents uploaded" placeholder row has no link
    const cells = row.querySelectorAll('td')
    result.push({
      name: (link.textContent ?? '').trim(),
      url: link.getAttribute('href') ?? '',
      size: (cells[1]?.textContent ?? '').trim(),
      date: (cells[2]?.textContent ?? '').trim(),
    })
  }
  return result
}
