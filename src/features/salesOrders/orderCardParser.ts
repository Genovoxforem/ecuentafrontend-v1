// Parses commande/card.php?id=X — a classic server-rendered Dolibarr page
// (unlike societe/card.php, this custom install never gave sales orders a
// JSON API: commande/salesorder/api/order_handler.php only has create-flow
// actions — create/validate/calculate/add_line/delete_line/etc, confirmed
// by reading that file directly — nothing for reading an existing order).
// Same scrape-the-real-page pattern as Ledger/Warehouse elsewhere in this
// app. Selectors below were verified against real fetched pages (order
// id=81, id=103, id=112), not guessed.
//
// This page's "Item Table" is a client-side grid (OrderManager) — its
// <tbody> only contains a hidden add-row template in the raw server HTML,
// so line rows themselves are NOT scrapable from the table markup. Instead,
// card.php embeds the real line data as a JSON array in an inline <script>
// (`var existingLines = [...]`, built straight from $object->lines via
// fetch_lines()) which OrderManager renders client-side. We parse that JSON
// directly — confirmed real, live data (not a template/placeholder): each
// object carries the exact llx_commandedet columns (qty, price_ht, tva_tx,
// remise_percent, cost_price/pa_ht, stock_reserve, line totals, etc).
// card.php omits the whole `existingLines` script block entirely when the
// order has zero lines (confirmed by reading its source), so a missing
// match here is the real "no lines" case, not a parse failure.

export interface OrderLineDetail {
  id: number
  productId: number
  productRef: string
  productLabel: string
  description: string
  qty: number
  unitPriceExcl: number
  unitPriceIncl: number
  vatRate: number
  vatCode: string
  discountPercent: number
  costPrice: number
  totalTtc: number
  stockReserve: boolean
}

export interface OrderAction {
  label: string
  url: string
}

export interface RelatedObjectRow {
  type: string
  ref: string
  url: string
  date: string
  amount: number
  statusLabel: string
  dellinkUrl: string
}

export interface DocGenOption {
  value: string
  label: string
}

export interface DocGenOptions {
  token: string
  modelOptions: DocGenOption[]
  langOptions: DocGenOption[]
  defaultLang: string
}

export interface MarginRow {
  label: string
  sellingPrice: number
  costPrice: number
  margin: number
}

export interface LinkedEventRow {
  ref: string
  url: string
  date: string
  by: string
  type: string
  title: string
}

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
  stockReserveEnabled: boolean | null
  lines: OrderLineDetail[]
  totalHt: number
  totalVat: number
  totalTtc: number
  editUrl: string
  refEditUrl: string
  refCustomerEditUrl: string
  projectEditUrl: string
  otherOrdersUrl: string
  cloneUrl: string
  deleteUrl: string
  actions: OrderAction[]
  relatedObjects: RelatedObjectRow[]
  docGenOptions: DocGenOptions
  marginRows: MarginRow[]
  linkedEvents: LinkedEventRow[]
  addEventUrl: string
  contactsUrl: string
  shipmentsUrl: string
  stockConsumptionUrl: string
  notesBadge: number
  documentsBadge: number
  agendaBadge: number
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

// Date and Currency specifically render via a DIFFERENT, simpler template
// once they're no longer directly editable on a given order (confirmed
// live: order id=125, a Validated order, has no edit-pencil for either —
// other Validated orders like id=81/112 still show one, so this depends on
// the order's own state, not just its status) — a plain
// `<td><label>LABEL</label></td><td>VALUE</td>` row with no action= link
// for findRowValueByAction to anchor on. This specific unwrapped
// `<td><label>` shape (no `<div class="row"><div class="col-12">` around
// it, unlike every editable row) is what distinguishes it from the
// unrelated modal templates that reuse the same label text elsewhere on
// the page (mentioned above). The value cell itself isn't always plain
// text either — confirmed live: order id=81's Date cell also carries a
// trailing "Late" warning icon `<span>` — so this greedily captures up to
// the row's closing </td> and runs it through stripTags() rather than
// assuming no inner markup.
function findPlainLabelRowValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<td><label class="form-label ">${escaped}</label></td><td>([\\s\\S]*?)</td>`)
  const m = re.exec(html)
  return m ? stripTags(m[1]) : ''
}

function findFieldValue(html: string, action: string, plainLabel: string): string {
  return findRowValueByAction(html, action) || findPlainLabelRowValue(html, plainLabel)
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

interface RawExistingLine {
  id: number
  fk_product: number
  product_ref: string
  product_label: string
  description: string
  qty: string | number
  price_ht: string | number
  price_ttc: string | number
  tva_tx: string | number
  default_vat_code: string
  remise_percent: string | number
  cost_price: string | number
  total_ttc: string | number
  stock_reserve: number
}

// `var existingLines = [...];` — a single-line JSON.stringify'd array (see
// header comment). Extracted by bracket-matching from the `[` right after
// the `=` rather than a lazy regex, since product/description text can
// itself contain `];`.
function parseExistingLines(html: string): OrderLineDetail[] {
  const anchor = html.indexOf('var existingLines = ')
  if (anchor === -1) return []
  const start = html.indexOf('[', anchor)
  if (start === -1) return []
  let depth = 0
  let end = -1
  for (let i = start; i < html.length; i++) {
    if (html[i] === '[') depth++
    else if (html[i] === ']') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return []
  let raw: RawExistingLine[]
  try {
    raw = JSON.parse(html.slice(start, end + 1))
  } catch {
    return []
  }
  return raw.map((l) => ({
    id: l.id,
    productId: Number(l.fk_product) || 0,
    productRef: l.product_ref ?? '',
    productLabel: l.product_label ?? '',
    description: l.description ?? '',
    qty: Number(l.qty) || 0,
    unitPriceExcl: Number(l.price_ht) || 0,
    unitPriceIncl: Number(l.price_ttc) || 0,
    vatRate: Number(l.tva_tx) || 0,
    vatCode: l.default_vat_code ?? '',
    discountPercent: Number(l.remise_percent) || 0,
    costPrice: Number(l.cost_price) || 0,
    totalTtc: Number(l.total_ttc) || 0,
    stockReserve: Number(l.stock_reserve) === 1,
  }))
}

// "Stock Reserve" row: plain `<tr><td>Stock Reserve</td><td><span
// class="text-success|text-warning">Enabled|Disabled</span></td></tr>` — no
// edit-action link on this one, unlike the other info-table rows above.
function parseStockReserveEnabled(html: string): boolean | null {
  const m = html.match(/<td>Stock Reserve<\/td><td><span class="text-(?:success|warning)">(Enabled|Disabled)<\/span>/)
  if (!m) return null
  return m[1] === 'Enabled'
}

// The tab bar above the card ("Sales Order" / "Contacts/Addresses" / ...)
// is a real, plain <a href> list — confirmed live (order id=112): each tab
// points at its own separate legacy page (contact.php, expedition/shipment
// .php, custom/consumption/card.php). Those 3 pages have their own,
// unrelated layouts (contact lists, shipment lists, a stock-consumption
// report) — genuinely separate scraping targets, not part of this page's
// own data, so this parser only captures the real link to open each one
// rather than fabricating a native rendering of pages it never fetched.
function findTabUrl(html: string, tabId: string): string {
  const re = new RegExp(`<a id="${tabId}"[^>]*href="([^"]*)"`)
  return (re.exec(html)?.[1] ?? '').replace(/&amp;/g, '&')
}

// Tab labels carry their own real badge count directly (`Notes<span
// class="badge ...">2</span>`) whenever it's non-zero — confirmed live
// (order id=125: Notes=2, Events/Agenda=2) — omitted entirely at zero, so a
// missing match here is the real "nothing to show" case.
function findTabBadge(html: string, tabId: string): number {
  const re = new RegExp(`<a id="${tabId}"[^>]*>[^<]*<span class="badge[^"]*">(\\d+)</span>`)
  const m = re.exec(html)
  return m ? Number(m[1]) : 0
}

// Header pencil-edit icon: a same-directory RELATIVE href ("card.php?id=X
// &action=modif", no leading slash) — confirmed live — unlike every other
// link on this page which is backend-root-absolute. Built directly rather
// than parsed, since a relative href can't be resolved generically the way
// stripBackendPrefix() handles the absolute ones.
function buildEditUrl(id: number): string {
  return `/commande/card.php?id=${id}&action=modif`
}

// Ref./Ref. customer/Project each carry their own real edit-pencil link
// (action=editref, action=editref_client, action=classify respectively) —
// confirmed live — distinct from the header's own action=modif pencil.
function findActionUrl(html: string, action: string): string {
  const m = html.match(new RegExp(`href="([^"]*action=${action}[^"]*)"`))
  return (m?.[1] ?? '').replace(/&amp;/g, '&')
}

// "(Other orders)" next to the third-party name: a real link to that
// customer's own filtered order list on the legacy backend.
function findOtherOrdersUrl(html: string): string {
  const m = html.match(/href="([^"]*commande\/list\.php\?socid=\d+[^"]*)">Other orders</)
  return (m?.[1] ?? '').replace(/&amp;/g, '&')
}

// Bottom action-button row (`<div class="tabsAction">...</div>`): a mix of
// plain GET links (Send email, Create contract, Create shipment, Create
// Invoice, Classify Billed) and modal-confirm-only buttons with href="#"
// (Modify/restore-to-draft, Classify delivered, Cancel, Clone, Delete) that
// POST via a Bootstrap modal with a CSRF token never exposed as a plain
// URL. Real hrefs are used as-is; href="#" buttons fall back to the base
// order page (a safe navigation, not a submission) so the user can perform
// the real confirm-and-submit flow in the actual legacy UI rather than
// this app guessing at unverified POST parameters for a mutating action.
// Clone/Delete specifically already have real plain-link equivalents
// elsewhere on the page (the header icons) — reused here instead of the
// base-order fallback so those two buttons stay fully functional.
function parseActionButtons(html: string, id: number, cloneUrl: string, deleteUrl: string): OrderAction[] {
  const start = html.indexOf('class="tabsAction"')
  if (start === -1) return []
  const boundary = html.indexOf('builddoc_form', start)
  const block = boundary === -1 ? html.slice(start, start + 8000) : html.slice(start, boundary)
  const baseOrderUrl = `/commande/card.php?id=${id}`
  const anchorRe = /<a class="(?:butAction|butActionDelete)[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g
  const actions: OrderAction[] = []
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(block))) {
    const label = m[2].trim()
    if (!label) continue
    let url = m[1] === '#' ? baseOrderUrl : m[1].replace(/&amp;/g, '&')
    if (label === 'Clone' && cloneUrl) url = cloneUrl
    if (label === 'Delete' && deleteUrl) url = deleteUrl
    actions.push({ label, url })
  }
  return actions
}

// Related Objects table: `<table data-block="showLinkedObject">` — a real
// header row (Type/Ref./Date/Amount/Status) followed by either one
// placeholder `<tr><td class="opacitymedium">None</td></tr>` (no
// data-element attribute) or real rows (`data-element="facture"` etc,
// confirmed live against order id=81's real linked invoices) — filtering
// on `tr[data-element]` cleanly selects only the real rows either way.
function parseRelatedObjects(doc: Document): RelatedObjectRow[] {
  const rows = Array.from(doc.querySelectorAll('table[data-block="showLinkedObject"] tr[data-element]'))
  return rows.map((row) => {
    const link = row.querySelector('.linkedcol-name a')
    const statusEl = row.querySelector('.linkedcol-statut [title]')
    const unlink = row.querySelector('.linkedcol-action a[href*="action=dellink"]')
    return {
      type: (row.querySelector('.linkedcol-element')?.textContent ?? '').trim(),
      ref: (link?.textContent ?? '').trim(),
      url: link?.getAttribute('href') ?? '',
      date: (row.querySelector('.linkedcol-date')?.textContent ?? '').trim(),
      amount: parseAmount(row.querySelector('.linkedcol-amount')?.textContent ?? ''),
      statusLabel: statusEl?.getAttribute('title') ?? '',
      dellinkUrl: unlink?.getAttribute('href') ?? '',
    }
  })
}

// Linked files' "Doc Template"/"Language"/Generate mini-form
// (`<form id="builddoc_form">`) is a real, working POST action (regenerates
// the order's PDF via the selected Dolibarr model/language) — same real
// backend mechanism already read for Send email. Parsed straight from this
// same already-fetched page rather than a second request, since the form
// lives right there in commande/card.php's own markup.
function parseDocGenOptions(html: string): DocGenOptions {
  const formIdx = html.indexOf('id="builddoc_form"')
  if (formIdx === -1) return { token: '', modelOptions: [], langOptions: [], defaultLang: 'en_US' }
  const formEnd = html.indexOf('End show_document', formIdx)
  const formHtml = html.slice(formIdx, formEnd === -1 ? formIdx + 400000 : formEnd)

  const token = formHtml.match(/name="token" value="([^"]*)"/)?.[1] ?? ''

  const modelOptions: DocGenOption[] = []
  const modelSelect = formHtml.match(/<select[^>]*name="model"[^>]*>([\s\S]*?)<\/select>/)
  if (modelSelect) {
    const re = /<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(modelSelect[1]))) modelOptions.push({ value: m[1], label: m[2].trim() })
  }

  const langOptions: DocGenOption[] = []
  let defaultLang = 'en_US'
  const langSelect = formHtml.match(/<select[^>]*id="lang_id"[^>]*>([\s\S]*?)<\/select>/)
  if (langSelect) {
    const re = /<option value="([^"]*)"( selected)?[^>]*>([^<]*)</g
    let m: RegExpExecArray | null
    while ((m = re.exec(langSelect[1]))) {
      langOptions.push({ value: m[1], label: m[3].trim() })
      if (m[2]) defaultLang = m[1]
    }
  }

  return { token, modelOptions, langOptions, defaultLang }
}

// Margin Details table: a fixed 4-column table (Margins/Selling
// price/Cost price/Margin) with exactly 3 real rows (Margin / Products,
// Margin / Services, Total Margin) — located by text-searching for the
// "Margin Details" section title then taking the next <table>, since this
// table has no distinguishing id/class of its own.
function parseMarginRows(html: string): MarginRow[] {
  const titleIdx = html.indexOf('Margin Details')
  if (titleIdx === -1) return []
  const tableStart = html.indexOf('<table', titleIdx)
  const tableEnd = html.indexOf('</table>', tableStart)
  if (tableStart === -1 || tableEnd === -1) return []
  const doc = new DOMParser().parseFromString(html.slice(tableStart, tableEnd + '</table>'.length), 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr')).filter((r) => !r.querySelector('.liste_titre'))
  return rows.map((r) => {
    const cells = r.querySelectorAll('td')
    return {
      label: (cells[0]?.textContent ?? '').trim(),
      sellingPrice: parseAmount(cells[1]?.textContent ?? ''),
      costPrice: parseAmount(cells[2]?.textContent ?? ''),
      margin: parseAmount(cells[3]?.textContent ?? ''),
    }
  })
}

// "Latest linked events" mini-table (real recent-activity log, e.g. the
// auto-inserted "Order validated" event) — located the same way as Margin
// Details (text-search for the section title, then the next <table>).
// Columns confirmed live: Ref./Date/By/Type/Title, plus a trailing
// status-badge cell with no header label. The "Add Event" (+) button next
// to the section title is a real GET link to a pre-filled event-creation
// form (comm/action/card.php?action=create&...) — safe to open, it only
// navigates to a form, it doesn't submit anything itself.
function parseLinkedEvents(html: string): LinkedEventRow[] {
  const titleIdx = html.search(/Latest\s+linked events/)
  if (titleIdx === -1) return []
  const tableStart = html.indexOf('<table', titleIdx)
  const tableEnd = html.indexOf('</table>', tableStart)
  if (tableStart === -1 || tableEnd === -1) return []
  const doc = new DOMParser().parseFromString(html.slice(tableStart, tableEnd + '</table>'.length), 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr')).filter((r) => !r.classList.contains('liste_titre'))
  return rows.map((row) => {
    const cells = row.querySelectorAll('td')
    const refLink = cells[0]?.querySelector('a')
    return {
      ref: (refLink?.textContent ?? cells[0]?.textContent ?? '').trim(),
      url: refLink?.getAttribute('href') ?? '',
      date: (cells[1]?.textContent ?? '').trim(),
      by: (cells[2]?.querySelector('.usertext')?.textContent ?? cells[2]?.textContent ?? '').trim(),
      type: (cells[3]?.textContent ?? '').trim(),
      title: (cells[4]?.textContent ?? '').trim(),
    }
  })
}

function findAddEventUrl(html: string): string {
  const m = html.match(/href="([^"]*comm\/action\/card\.php\?action=create[^"]*)"/)
  return (m?.[1] ?? '').replace(/&amp;/g, '&')
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
  const deleteMatch = html.match(/href="([^"]*action=delete&[^"]*)"/)
  const cloneUrl = (cloneMatch?.[1] ?? '').replace(/&amp;/g, '&')
  const deleteUrl = (deleteMatch?.[1] ?? '').replace(/&amp;/g, '&')

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
    orderDate: findFieldValue(html, 'editdate&', 'Date'),
    plannedDelivery: findRowValueByAction(html, 'editdate_livraison'),
    shippingMethod: findRowValueByAction(html, 'editshippingmethod'),
    paymentTerms: findRowValueByAction(html, 'editconditions'),
    paymentType: findRowValueByAction(html, 'editmode&'),
    currencyLabel: findFieldValue(html, 'editmulticurrencycode', 'Currency'),
    availabilityDelay: findRowValueByAction(html, 'editavailability'),
    channel: findRowValueByAction(html, 'editdemandreason'),
    incoterms: findRowValueByAction(html, 'editincoterm&'),
    bankAccountLabel: findRowValueByAction(html, 'editbankaccount'),
    discountNote,
    stockReserveEnabled: parseStockReserveEnabled(html),
    lines: parseExistingLines(html),
    totalHt,
    totalVat,
    totalTtc,
    editUrl: buildEditUrl(id),
    refEditUrl: findActionUrl(html, 'editref&'),
    refCustomerEditUrl: findActionUrl(html, 'editref_client'),
    projectEditUrl: findActionUrl(html, 'classify&'),
    otherOrdersUrl: findOtherOrdersUrl(html),
    cloneUrl,
    deleteUrl,
    actions: parseActionButtons(html, id, cloneUrl, deleteUrl),
    relatedObjects: parseRelatedObjects(doc),
    docGenOptions: parseDocGenOptions(html),
    marginRows: parseMarginRows(html),
    linkedEvents: parseLinkedEvents(html),
    addEventUrl: findAddEventUrl(html),
    contactsUrl: findTabUrl(html, 'contact'),
    shipmentsUrl: findTabUrl(html, 'shipping'),
    stockConsumptionUrl: findTabUrl(html, 'conso'),
    notesBadge: findTabBadge(html, 'note'),
    documentsBadge: findTabBadge(html, 'documents'),
    agendaBadge: findTabBadge(html, 'agenda'),
  }
}

// note.php: "Note (public)"/"Note (private)" labels followed by a sibling
// content <div class="tagtdremove ... sensiblehtmlcontent">...</div>.
export interface OrderNotes {
  notePublic: string
  notePrivate: string
  notePublicEditUrl: string
  notePrivateEditUrl: string
}

function findNoteContent(doc: Document, label: string): string {
  const labelEl = Array.from(doc.querySelectorAll('label.form-label')).find((el) => el.textContent?.trim() === label)
  const container = labelEl?.closest('.tagtd, .row')?.parentElement
  const contentEl = container?.querySelector('.tagtdremove.sensiblehtmlcontent, .tagtdremove')
  return (contentEl?.textContent ?? '').trim()
}

// Each note label carries its own real edit-pencil link
// (action=editnote_public / action=editnote_private) — confirmed live.
function findNoteEditUrl(html: string, action: string): string {
  const m = html.match(new RegExp(`href="([^"]*action=${action}[^"]*)"`))
  return (m?.[1] ?? '').replace(/&amp;/g, '&')
}

export function parseOrderNotesHtml(html: string): OrderNotes {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return {
    notePublic: findNoteContent(doc, 'Note (public)'),
    notePrivate: findNoteContent(doc, 'Note (private)'),
    notePublicEditUrl: findNoteEditUrl(html, 'editnote_public'),
    notePrivateEditUrl: findNoteEditUrl(html, 'editnote_private'),
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
  deleteUrl: string
}

// Each real row carries 3 distinct action links besides the filename itself
// (confirmed live, order id=79): a "preview" link (`.documentpreview`, same
// target file — a JS lightbox we don't replicate, since opening the file
// itself achieves the same real outcome), an "edit"/rename link
// (`.editfilelink`, action=editfile), and a "delete" link
// (`.deletefilelink`, action=deletefile). Only delete is exposed here —
// rename requires a filename-prompt UI for a low-value feature, and preview
// is already covered by the existing filename link.
export function parseOrderDocumentsHtml(html: string): OrderDocumentRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rows = Array.from(doc.querySelectorAll('table#tablelines tr')).filter((r) => !r.classList.contains('liste_titre'))
  const result: OrderDocumentRow[] = []
  for (const row of rows) {
    const link = row.querySelector('a.paddingright.valignmiddle[href*="document.php"]') ?? row.querySelector('a[href*="document.php"]')
    if (!link) continue // the "No documents uploaded" placeholder row has no link
    const cells = row.querySelectorAll('td')
    const deleteLink = row.querySelector('a.deletefilelink')
    result.push({
      name: (link.textContent ?? '').trim(),
      url: link.getAttribute('href') ?? '',
      size: (cells[1]?.textContent ?? '').trim(),
      date: (cells[2]?.textContent ?? '').trim(),
      deleteUrl: deleteLink?.getAttribute('href') ?? '',
    })
  }
  return result
}

// The rest of document.php: a real summary block (dol_dir_list()'s own
// file count/size, not derived from the table above), the real "Attach a
// new file/document" and "Link a new file/document" forms (see
// core/actions_linkedfiles.inc.php's own sendit/linkit handlers, read
// directly — POSTs go straight back to this same page, no separate REST
// endpoint), and a second, separate "Linked files and documents" table for
// URL-based links (core/class/html.formfile.class.php's showLinks(),
// confirmed by reading that method directly). Verified live (order id=79):
// exact summary text is "Number of attached files/documents" / "Total
// size of attached files/documents" (lowercase, easy to miss with a
// case-sensitive search — see this session's own "validated" gotcha on the
// Agenda page). No real non-empty links row has been observed on this
// backend; showLinks()'s real column layout (Links / (blank) / Date /
// (blank) / actions) is read straight from its PHP, not guessed, so cells
// are addressed by that confirmed position. showLinks() also prints a
// delete icon per link row, but its href always hardcodes action=delete —
// which core/tpl/document_actions_post_headers.tpl.php's own confirm box
// never matches (it only checks action=deletefile/deletelink) — a genuine
// dead end in the legacy app itself, not something to route around here,
// so no unlink action is exposed for this table.
export interface LinkedFileRow {
  label: string
  url: string
  date: string
}

export interface DocumentsPageMeta {
  attachToken: string
  attachedCount: number
  totalSize: string
  savingDocMask: string
  links: LinkedFileRow[]
}

export function parseDocumentsPageMeta(html: string): DocumentsPageMeta {
  const attachToken = html.match(/name="token" value="([^"]*)"/)?.[1] ?? ''
  const attachedCount = Number(html.match(/Number of attached files\/documents<\/td>\s*<td[^>]*>(\d+)<\/td>/i)?.[1] ?? '0')
  const totalSize = html.match(/Total size of attached files\/documents<\/td>\s*<td[^>]*>([^<]*)<\/td>/i)?.[1]?.trim() ?? ''
  const savingDocMask = html.match(/class="savingdocmask" name="savingdocmask" value="([^"]*)"/)?.[1] ?? ''

  const links: LinkedFileRow[] = []
  const idx = html.indexOf('table-list-of-links')
  if (idx !== -1) {
    const tableStart = html.indexOf('<table', idx)
    const tableEnd = html.indexOf('</table>', tableStart)
    if (tableStart !== -1 && tableEnd !== -1) {
      const doc = new DOMParser().parseFromString(html.slice(tableStart, tableEnd + '</table>'.length), 'text/html')
      const rows = Array.from(doc.querySelectorAll('tbody tr.oddeven'))
      for (const row of rows) {
        const link = row.querySelector('a[href]')
        if (!link) continue // the "No registered links" placeholder row has no link
        const cells = row.querySelectorAll('td')
        links.push({
          label: (link.textContent ?? '').trim(),
          url: link.getAttribute('href') ?? '',
          date: (cells[2]?.textContent ?? '').trim(),
        })
      }
    }
  }

  return { attachToken, attachedCount, totalSize, savingDocMask, links }
}
