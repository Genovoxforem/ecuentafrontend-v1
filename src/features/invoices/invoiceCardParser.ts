// Parses compta/facture/card.php?facid=X — Dolibarr's classic Sales Invoice
// card page. This app used to fetch a custom compta/sales/api/invoice.php
// JSON endpoint instead, built for a different, separate custom page
// (compta/sales/card.php) — that module isn't installed on every backend
// this app runs against (confirmed live: real, consistent 404s on
// demo.ecuenta.online, invoices 32 and 418), and even where it does answer,
// its facid numbering isn't the same record space as this page's — the same
// facid returned two completely different invoices between the two. This
// page, and its 6 tab pages, are real and live on every backend checked.
// Same scrape-the-real-page approach as Sales Orders (orderCardParser.ts),
// whose extraction helpers this is modeled directly on. Selectors verified
// against a real fetched page (invoice facid=418), not guessed.

export interface InvoiceLineRow {
  rowid: string
  productId: string | null
  productUrl: string
  label: string
  // Real inline badge (`<span title="Batch: ...">`) printed right inside
  // the description cell for a batch/lot-tracked line, not a separate
  // table cell — '' for the (usual) non-tracked case. Two now-removed
  // fields belong here for the record: landedCost/.linecolrefsupplier is
  // real markup, but that <td> is only ever printed for supplier-side
  // documents (order_supplier/invoice_supplier/supplier_proposal — see
  // objectline_view.tpl.php), never for this page's own sales invoices, so
  // it always came back empty; costPrice/.linecolmargin1 is real too but
  // gated behind the margin module + a margins/creer permission this
  // install's real invoice view doesn't have enabled either (confirmed:
  // no "Cost Price" column on any real invoice screenshot checked this
  // session). Neither belongs on this table.
  lotBatch: string
  vatRatePercent: string
  unitPriceExcl: string
  unitPriceIncl: string
  qty: string
  discountPercent: string
  totalIncl: string
}

export interface InvoiceZraDetails {
  status: string
  receiptNo: string
  internalData: string
  invoiceSignature: string
  invoiceNo: string
  sdcId: string
  mrc: string
  date: string
}

export interface InvoiceAction {
  label: string
  url: string
}

export interface InvoicePaymentRow {
  ref: string
  url: string
  date: string
  type: string
  bankAccount: string
  amount: string
}

export interface InvoiceGrnDetails {
  gdnNo: string
  grnNo: string
  month: string
  shippingVia: string
  shippingDate: string
  trackingId: string
  transporter: string
  truckDetails: string
  shippingAddress: string
}

export interface InvoiceMarginRow {
  sellingPrice: string
  costPrice: string
  margin: string
}

export interface InvoiceMarginDetails {
  marginOnProducts: InvoiceMarginRow
  marginOnServices: InvoiceMarginRow
  totalMargin: InvoiceMarginRow
}

export interface InvoiceProductOption {
  value: string
  label: string
}

export interface InvoiceWarehouseOption {
  value: string
  label: string
  selected: boolean
}

// Only present on a real DRAFT invoice (statut=0): the classic `#idprod`
// product select from the real `addproduct`/action=addline form, and the
// `#idwarehouse` select from the real "Select Warehouse" modal shown by the
// page's own "Create Invoice" button (form action=confirm_valid) — both
// confirmed live, invoice facid=1057. null once the invoice is no longer a
// draft, since neither element is rendered by the real page at that point.
export interface InvoiceDraftFormOptions {
  productOptions: InvoiceProductOption[]
  warehouseOptions: InvoiceWarehouseOption[]
}

export interface DocGenOption {
  value: string
  label: string
}

export interface DocGenOptions {
  token: string
  modelOptions: DocGenOption[]
}

export interface InvoiceDetail {
  id: number
  ref: string
  refEditUrl: string
  refClient: string
  refClientEditUrl: string
  thirdPartyName: string
  thirdPartySocid: number | null
  otherInvoicesUrl: string
  projectLabel: string
  projectEditUrl: string
  statusLabel: string
  statusBadgeNumber: number | null
  secondaryStatusLabel: string

  typeLabel: string
  typeNote: string
  discountInfo: string
  invoiceDate: string
  paymentTerms: string
  paymentTermsEditUrl: string
  paymentDueOn: string
  paymentDueOnEditUrl: string
  paymentType: string
  paymentTypeEditUrl: string
  currencyLabel: string
  bankAccount: string
  bankAccountEditUrl: string
  incoterms: string
  incotermsEditUrl: string

  amountExclTax: string
  vatAmount: string
  amountInclTax: string

  zra: InvoiceZraDetails

  lines: InvoiceLineRow[]

  actions: InvoiceAction[]

  payments: InvoicePaymentRow[]
  alreadyPaid: string
  billed: string
  remainingUnpaid: string

  docGenOptions: DocGenOptions

  // Real "URL for Online payment" box (`#onlinepaymenturl`) — a real,
  // clickable public payment link built from the invoice's own ref, shown
  // only once payment-by-link is set up on this install; '' otherwise.
  onlinePaymentUrl: string

  // Real "Shipment / GRN Details" card (a custom field on llx_facture,
  // `grndetails`, stored as JSON) — only rendered by the real page at all
  // once that JSON is non-empty for this invoice, same "null when absent,
  // never a fabricated empty block" convention as everything else here.
  grnDetails: InvoiceGrnDetails | null

  // null once validated — see InvoiceDraftFormOptions.
  draftFormOptions: InvoiceDraftFormOptions | null

  notesBadge: number
  documentsBadge: number
  agendaBadge: number
}

function stripTags(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(raw: string): number {
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

// Ref/Ref. customer: `<label class="form-label ">Ref.</label> <a
// class="editfielda" href="...">...</a> : VALUE<a onclick=loadzradetails()>...`
// for Ref specifically (a ZRA-portal shortcut icon sits right after the
// value, so this stops at the next `<` rather than assuming `<br>`
// follows), `<label...>Ref. customer</label> <a ...>...</a> : VALUE<br>`
// for the rest. The `</label>` wrapper is a recent backend change (confirmed
// live on a draft invoice, facid=1057) not present when this was first
// written (facid=418) — made optional so both builds parse.
function findRefLikeValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${escaped}(?:<\\/label>)?\\s*<a class="editfielda"[\\s\\S]*?<\\/a>\\s*:\\s*([^<]*)<`)
  const m = re.exec(html)
  return (m?.[1] ?? '').trim()
}

// Each header field's own real edit-pencil link carries the real Dolibarr
// action name (action=editref, action=editref_client, action=classify) —
// confirmed unique across the page, same convention as Sales Orders.
function findActionUrl(html: string, action: string): string {
  const m = html.match(new RegExp(`href="([^"]*action=${action}[^"]*)"`))
  return (m?.[1] ?? '').replace(/&amp;/g, '&')
}

// The anchor's visible content is a `<div class="avatar-circle">XX</div>`
// initials bubble immediately followed by the plain third-party name text
// with no separating whitespace (confirmed live) — stripped out before
// reading text so the initials don't leak into the name (e.g. "TEtest1").
function findThirdParty(html: string): { name: string; socid: number | null } {
  const m = html.match(/Third-party\s*:\s*<a href="\/comm\/card\.php\?socid=(\d+)"[^>]*>([\s\S]*?)<\/a>/)
  if (!m) return { name: '', socid: null }
  const div = document.createElement('div')
  div.innerHTML = m[2]
  div.querySelectorAll('.avatar-circle').forEach((el) => el.remove())
  return { name: (div.textContent ?? '').replace(/\s+/g, ' ').trim(), socid: Number(m[1]) }
}

// Invoice Details table has a confirmed-broken-tag row ("Bank account<td>"
// instead of "...</td><td>", a real defect in the page's own markup, not a
// parsing artifact) — same class of issue Sales Orders' own comment already
// documents for its info table. Text-anchored extraction, not DOM
// selectors, for the same reason: every row shares one real shape — the
// label sits in its own nested one-row `<table class="newCustomUItable">`
// (holding a real `<a class="editfielda" href="...action=X...">` pencil
// when the field is actually editable), and the value is the OUTER row's
// own next top-level <td>, a sibling of the <td> holding that nested table
// — confirmed live for both the editable rows (Payment Terms/Payment due
// on/Payment Type/Bank account/Incoterms) and the two that never carry a
// pencil at all on this view (Invoice date, Currency).
function valueAfterNestedTable(html: string, anchorIdx: number): string {
  if (anchorIdx === -1) return ''
  const tableEnd = html.indexOf('</table>', anchorIdx)
  if (tableEnd === -1) return ''
  const valueTdStart = html.indexOf('<td', tableEnd)
  if (valueTdStart === -1) return ''
  const contentStart = html.indexOf('>', valueTdStart) + 1
  const contentEnd = html.indexOf('</td>', contentStart)
  if (contentEnd === -1) return ''
  return stripTags(html.slice(contentStart, contentEnd))
}

function findEditableDetailValue(html: string, action: string): string {
  return valueAfterNestedTable(html, html.indexOf(`action=${action}`))
}

function findPlainDetailValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return valueAfterNestedTable(html, html.search(new RegExp(`<td[^>]*>${escaped}(?:<|\\s*<\\/td>)`)))
}

function findDetailValue(html: string, action: string, label: string): string {
  return findEditableDetailValue(html, action) || findPlainDetailValue(html, label)
}

// Type field: `<td class="valuefield fieldname_type"><span
// class="badgeneutral">Standard invoice</span> <span
// class="opacitymediumbycolor paddingleft">(POS Takepos - Terminal 1)</span>
// </td>` — the parenthetical only appears for invoices created through a
// POS terminal (confirmed live: present on facid=418, a POS sale) — an
// empty typeNote is the real "not from POS" case, not a parse failure.
function findTypeInfo(html: string): { typeLabel: string; typeNote: string } {
  const m = html.match(
    /class="valuefield fieldname_type">\s*<span class="badgeneutral">([^<]*)<\/span>(?:\s*<span class="opacitymediumbycolor[^"]*">\(([^<]*)\)<\/span>)?/,
  )
  return { typeLabel: (m?.[1] ?? '').trim(), typeNote: (m?.[2] ?? '').trim() }
}

function findDiscountInfo(html: string): string {
  const m = html.match(/Discounts<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/)
  return m ? stripTags(m[1]) : ''
}

// ZRA Invoice Details block — a fixed-shape `<table class="newCustomUItable
// amountdisplay">` with a status badge row then 7 plain label/value rows.
// Located by its own distinctive first row rather than a generic table
// search, since "ZRA Invoice Status" doesn't appear anywhere else on the
// page (confirmed live).
function parseZraDetails(html: string): InvoiceZraDetails {
  const statusMatch = html.match(/ZRA Invoice Status<\/td>[\s\S]*?class="badge[^"]*"[^>]*>([^<]*)<\/span>/)
  const rowValue = (label: string) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp(`<td>${escaped}<\\/td>\\s*<td>([\\s\\S]*?)<\\/td>`).exec(html)
    return m ? stripTags(m[1]) : ''
  }
  return {
    status: (statusMatch?.[1] ?? '').trim(),
    receiptNo: rowValue('Receipt No'),
    internalData: rowValue('Internal Data'),
    invoiceSignature: rowValue('Invoice Signature'),
    invoiceNo: rowValue('Invoice No'),
    sdcId: rowValue('SDC ID'),
    mrc: rowValue('MRC'),
    date: rowValue('Date'),
  }
}

// "Shipment / GRN Details" card — only printed at all once the invoice's
// own grndetails JSON is non-empty (confirmed live in the real PHP source),
// so absence here is a real "nothing recorded", not a parse miss. Each
// field is itself conditional on the real page too (only non-empty ones
// get a row), so every lookup below defaults to '' rather than assuming
// the row exists.
function parseGrnDetails(html: string): InvoiceGrnDetails | null {
  const headingIdx = html.indexOf('Shipment / GRN Details')
  if (headingIdx === -1) return null
  const tableStart = html.indexOf('<table', headingIdx)
  if (tableStart === -1) return null
  const tableEnd = html.indexOf('</table>', tableStart)
  const block = html.slice(tableStart, tableEnd === -1 ? tableStart + 4000 : tableEnd)
  const cell = (label: string) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp(`>${escaped}\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`).exec(block)
    return m ? stripTags(m[1]) : ''
  }
  return {
    gdnNo: cell('GDN No \\.'),
    grnNo: cell('GRN No \\.'),
    month: cell('Month'),
    shippingVia: cell('Shipping Via'),
    shippingDate: cell('Shipping Date'),
    trackingId: cell('Tracking ID'),
    transporter: cell('Transporter'),
    truckDetails: cell('Truck Details'),
    shippingAddress: cell('Shipping Address'),
  }
}

// Draft-only product/warehouse selects — see InvoiceDraftFormOptions above.
function parseDraftFormOptions(doc: Document): InvoiceDraftFormOptions | null {
  const productSelect = doc.querySelector<HTMLSelectElement>('#idprod')
  if (!productSelect) return null
  const productOptions: InvoiceProductOption[] = Array.from(productSelect.options)
    .filter((o) => o.value && o.value !== '0')
    .map((o) => ({ value: o.value, label: (o.textContent ?? '').trim() }))

  const warehouseSelect = doc.querySelector<HTMLSelectElement>('#idwarehouse')
  const warehouseOptions: InvoiceWarehouseOption[] = warehouseSelect
    ? Array.from(warehouseSelect.options)
        .filter((o) => o.value && o.value !== '-1')
        .map((o) => ({ value: o.value, label: (o.textContent ?? '').trim(), selected: o.selected }))
    : []

  return { productOptions, warehouseOptions }
}

// "Margin Details" card — real output of the backend's own
// displayMarginInfos() (core/class/html.formmargin.class.php), rendered
// directly on document.php below the "Linked files" section (confirmed live
// on invoices 43/1059/1060: always present, same fixed 3-row shape —
// MarginOnProducts/MarginOnServices/TotalMargin, each with
// SellingPrice/CostPrice/Margin).
function parseMarginRow(block: string, label: string): InvoiceMarginRow {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`<td>${escaped}<\\/td>\\s*<td[^>]*>([^<]*)<\\/td>\\s*<td[^>]*>([^<]*)<\\/td>\\s*<td[^>]*>([^<]*)<\\/td>`).exec(block)
  return {
    sellingPrice: (m?.[1] ?? '').trim(),
    costPrice: (m?.[2] ?? '').trim(),
    margin: (m?.[3] ?? '').trim(),
  }
}

export function parseInvoiceMarginDetails(html: string): InvoiceMarginDetails | null {
  const headingIdx = html.indexOf('Margin Details')
  if (headingIdx === -1) return null
  const tableStart = html.indexOf('<table', headingIdx)
  if (tableStart === -1) return null
  const tableEndIdx = html.indexOf('</table>', tableStart)
  const block = html.slice(tableStart, tableEndIdx === -1 ? tableStart + 4000 : tableEndIdx)
  return {
    marginOnProducts: parseMarginRow(block, 'MarginOnProducts'),
    marginOnServices: parseMarginRow(block, 'MarginOnServices'),
    totalMargin: parseMarginRow(block, 'TotalMargin'),
  }
}

// Item Table real rows: `<tr id="row-N" class="drag drop oddeven"
// data-element="facturedet" data-id="N" ...>` — one per real invoice line
// (confirmed live). The bulk "Select Tax Category" apply-to-all-lines
// dropdown in the header lives in the same table but carries no
// data-element, so filtering on that attribute naturally excludes it.
function parseInvoiceLines(doc: Document): InvoiceLineRow[] {
  const rows = Array.from(doc.querySelectorAll('tr[data-element="facturedet"]'))
  return rows.map((row) => {
    const productLink = row.querySelector('.linecoldescription a[href*="/product/card.php"]')
    const idMatch = productLink?.getAttribute('href')?.match(/id=(\d+)/)
    const labelCell = row.querySelector('.linecoldescription')
    // The real Lot/Batch value is a `<span title="Batch: ...">` badge
    // printed inline inside this same description cell
    // (objectline_view.tpl.php), not its own <td> — pulled out here and
    // stripped from a clone before reading label text so it doesn't leak
    // into the product name.
    let label = ''
    let lotBatch = ''
    if (labelCell) {
      const batchBadge = labelCell.querySelector<HTMLElement>('span[title^="Batch:"]')
      lotBatch = (batchBadge?.textContent ?? '').replace(/\s+/g, ' ').trim()
      const clone = labelCell.cloneNode(true) as HTMLElement
      clone.querySelectorAll('span[title^="Batch:"], span[title="Unit of Measure"]').forEach((el) => el.remove())
      label = (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
    }
    return {
      rowid: row.getAttribute('data-id') ?? '',
      productId: idMatch ? idMatch[1] : null,
      productUrl: productLink?.getAttribute('href') ?? '',
      label,
      lotBatch,
      vatRatePercent: (row.querySelector('.linecolvat .flex-fill')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      unitPriceExcl: (row.querySelector('.linecoluht')?.textContent ?? '').trim(),
      unitPriceIncl: (row.querySelector('.linecoluttc')?.textContent ?? '').trim(),
      qty: (row.querySelector('.linecolqty')?.textContent ?? '').trim(),
      discountPercent: (row.querySelector('.linecoldiscount')?.textContent ?? '').replace(/ /g, '').trim(),
      totalIncl: (row.querySelector('.linecolht')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    }
  })
}

// Bottom action-button row (`<div class="tabsAction d-flex">`): real plain
// GET links (Re-Open, Send email, POS Ticket, Create credit note, Clone)
// plus one JS-only button (Send WhatsApp, calls WhatsAppSender.sendInvoice(id)
// with no plain URL equivalent — skipped below, same reasoning Sales Orders
// uses for its own modal-only buttons: don't fabricate an unverified URL for
// a mutating action). POS Ticket only renders when the invoice actually came
// from a POS terminal — its absence is the real "not a POS sale" case, and
// Re-Open/Create credit note/Update to ZRA are each conditional on the
// invoice's own status (a Paid or already ZRA-synced invoice doesn't carry
// every button) — an empty or partial list here is real, not a parse miss.
//
// This page renders `class="tabsAction d-flex"` TWICE (confirmed live,
// invoice facid=43): an icon-only shortcut bar right under the header
// (just Clone + a close-list "x", no text — their anchor content starts
// with an `<i>` icon, not text) and the real, fully-labeled action row right
// before the Payment Details section. Taking the FIRST occurrence (as this
// used to) always lands on the icon-only bar, and its anchors have no text
// between `>` and the first `<`, so the old `[^<]*` label capture always
// came back empty and got filtered out — every invoice silently showed zero
// actions. The real row is the LAST occurrence, immediately before
// `class="fichecenter"`.
function parseActions(html: string): InvoiceAction[] {
  const start = html.lastIndexOf('class="tabsAction')
  if (start === -1) return []
  const end = html.indexOf('class="fichecenter', start)
  const block = end === -1 ? html.slice(start, start + 4000) : html.slice(start, end)
  // Non-greedy `[\s\S]*?` (not `[^<]*`) so a label wrapping an icon, e.g.
  // `<i class="fab fa-whatsapp"></i> Send WhatsApp`, is captured in full
  // rather than stopping at that inner tag's own `<`; stripTags then drops
  // the icon markup to leave the plain label text.
  const anchorRe = /<a[^>]*class="butAction[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
  const actions: InvoiceAction[] = []
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(block))) {
    const url = m[1].replace(/&amp;/g, '&')
    if (url.startsWith('javascript:')) continue // Send WhatsApp — see header comment.
    const label = stripTags(m[2]).trim()
    if (!label) continue
    actions.push({ label, url })
  }
  return actions
}

// Payment Details: real table right after the `<span
// class="paymenttitle...">Payment Details</span>` marker — real payment
// rows carry class="oddeven" (ref link to compta/paiement/card.php), followed
// by 3 fixed summary rows (Already paid/Billed/Remaining unpaid), each a
// colspan="4" label cell + a distinctly-classed amount cell (.amountalreadypaid
// / plain right-aligned cell / .amountpaymentcomplete — confirmed live).
function parsePaymentDetails(html: string): { payments: InvoicePaymentRow[]; alreadyPaid: string; billed: string; remainingUnpaid: string } {
  const titleIdx = html.indexOf('paymenttitle')
  if (titleIdx === -1) return { payments: [], alreadyPaid: '', billed: '', remainingUnpaid: '' }
  const tableStart = html.lastIndexOf('<table', titleIdx)
  const tableEnd = html.indexOf('</table>', titleIdx)
  if (tableStart === -1 || tableEnd === -1) return { payments: [], alreadyPaid: '', billed: '', remainingUnpaid: '' }
  const block = html.slice(tableStart, tableEnd + '</table>'.length)
  const doc = new DOMParser().parseFromString(block, 'text/html')

  const payments: InvoicePaymentRow[] = Array.from(doc.querySelectorAll('tr.oddeven')).map((row) => {
    const cells = row.querySelectorAll('td')
    const refLink = cells[0]?.querySelector('a')
    const bankLink = cells[3]?.querySelector('a')
    return {
      ref: (refLink?.textContent ?? '').trim(),
      url: refLink?.getAttribute('href') ?? '',
      date: (cells[1]?.textContent ?? '').trim(),
      type: (cells[2]?.textContent ?? '').trim(),
      bankAccount: (bankLink?.textContent ?? cells[3]?.textContent ?? '').trim(),
      amount: (cells[4]?.textContent ?? '').trim(),
    }
  })

  const alreadyPaid = (doc.querySelector('.amountalreadypaid')?.textContent ?? '').trim()
  const remainingUnpaid = (doc.querySelector('.amountpaymentcomplete')?.textContent ?? '').trim()
  const billedMatch = block.match(/Billed<\/span>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/)
  const billed = billedMatch ? stripTags(billedMatch[1]) : ''

  return { payments, alreadyPaid, billed, remainingUnpaid }
}

// Linked-files preview form on this tab (`<form id="builddoc_form">`): the
// doc-generation template picker — real, working, same mechanism Sales
// Orders' own parseDocGenOptions() already reads. Only the model list is
// captured here (language selection isn't exposed by this app's own
// document-generation UI elsewhere either).
function parseDocGenOptions(html: string): DocGenOptions {
  const formIdx = html.indexOf('id="builddoc_form"')
  if (formIdx === -1) return { token: '', modelOptions: [] }
  const formEnd = html.indexOf('</form>', formIdx)
  const formHtml = html.slice(formIdx, formEnd === -1 ? formIdx + 20000 : formEnd)
  const token = formHtml.match(/name="token" value="([^"]*)"/)?.[1] ?? ''
  const modelOptions: DocGenOption[] = []
  const modelSelect = formHtml.match(/<select[^>]*name="model"[^>]*>([\s\S]*?)<\/select>/)
  if (modelSelect) {
    const re = /<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(modelSelect[1]))) modelOptions.push({ value: m[1], label: m[2].trim() })
  }
  return { token, modelOptions }
}

// Tab labels carry their own real badge count directly (`Linked files<span
// class="badge ...">1</span>`) whenever it's non-zero, omitted at zero —
// same convention as Sales Orders' findTabBadge().
function findTabBadge(html: string, tabId: string): number {
  const re = new RegExp(`<a id="${tabId}"[^>]*>[^<]*<span class="badge[^"]*">(\\d+)</span>`)
  const m = re.exec(html)
  return m ? Number(m[1]) : 0
}

// note.php: "Note (public)"/"Note (private)" render as a plain `<td
// class="nowrap">Note (public)</td>` label (no `<label>` element, unlike
// Sales Orders' equivalent — a genuinely different template) followed by
// its own mini-table (holding the real edit-pencil link) then a sibling
// `<div class="tagtdremove ... sensiblehtmlcontent">CONTENT</div>` — the
// bare page (no action= param) never renders a textarea, only this
// read-only content div, same "action=edit* needed for the real form"
// pattern as accountancy/bookkeeping/card.php's own header fields.
export interface InvoiceNotes {
  notePublic: string
  notePrivate: string
  notePublicEditUrl: string
  notePrivateEditUrl: string
}

function findNoteValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<td class="nowrap">${escaped}<\\/td>[\\s\\S]*?<\\/table>\\s*<\\/div>\\s*<div class="tagtdremove[^"]*">([\\s\\S]*?)<\\/div>`)
  const m = re.exec(html)
  return m ? stripTags(m[1]) : ''
}

export function parseInvoiceNotesHtml(html: string): InvoiceNotes {
  return {
    notePublic: findNoteValue(html, 'Note (public)'),
    notePrivate: findNoteValue(html, 'Note (private)'),
    notePublicEditUrl: findActionUrl(html, 'editnote_public'),
    notePrivateEditUrl: findActionUrl(html, 'editnote_private'),
  }
}

// prelevement.php ("Direct debit orders" tab): real columns Request
// date/User/Amount/Direct debit order (ref)/Process date (2 further blank
// action-icon columns, confirmed live) — a real header row rendered with
// plain <td>s (not <th>), and a single `<td colspan="7"
// class="opacitymedium">None</td>` placeholder row when empty (confirmed
// live, invoice facid=418 — no real non-empty sample seen yet on this
// backend, so real data rows are read positionally by the same 7-column
// layout the header itself declares, not guessed from an unseen sample).
export interface StandingOrderRow {
  requestDate: string
  user: string
  amount: string
  ref: string
  processDate: string
}

export function parseInvoiceStandingOrdersHtml(html: string): StandingOrderRow[] {
  const headerIdx = html.indexOf('Direct debit order<')
  if (headerIdx === -1) return []
  const tableStart = html.lastIndexOf('<table', headerIdx)
  const tableEnd = html.indexOf('</table>', headerIdx)
  if (tableStart === -1 || tableEnd === -1) return []
  const doc = new DOMParser().parseFromString(html.slice(tableStart, tableEnd + '</table>'.length), 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr')).slice(1) // skip the plain-<td> header row
  const result: StandingOrderRow[] = []
  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    if (cells.length <= 1) continue // the "None" placeholder row
    result.push({
      requestDate: (cells[0]?.textContent ?? '').trim(),
      user: (cells[1]?.textContent ?? '').trim(),
      amount: (cells[2]?.textContent ?? '').trim(),
      ref: (cells[3]?.textContent ?? '').trim(),
      processDate: (cells[5]?.textContent ?? '').trim(),
    })
  }
  return result
}

export function parseInvoiceCardHtml(html: string, id: number): InvoiceDetail {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const ref = findRefLikeValue(html, 'Ref.')
  const refClient = findRefLikeValue(html, 'Ref. customer')
  const { name: thirdPartyName, socid: thirdPartySocid } = findThirdParty(html)
  const otherInvoicesUrl = (html.match(/href="([^"]*)">Other invoices<\/a>/)?.[1] ?? '').replace(/&amp;/g, '&')
  const projectLabel = findRefLikeValue(html, 'Project')

  let statusLabel = ''
  let statusBadgeNumber: number | null = null
  const statusEl = doc.querySelector('.subTitle .badge-status')
  if (statusEl) {
    statusLabel = (statusEl.textContent ?? '').trim()
    const classMatch = (statusEl.getAttribute('class') ?? '').match(/badge-status(\d+)/)
    statusBadgeNumber = classMatch ? Number(classMatch[1]) : null
  }
  const secondaryStatusLabel = (doc.querySelector('.statusrefbis .opacitymedium')?.textContent ?? '').trim()

  const { typeLabel, typeNote } = findTypeInfo(html)
  const { payments, alreadyPaid, billed, remainingUnpaid } = parsePaymentDetails(html)

  return {
    id,
    ref,
    refEditUrl: findActionUrl(html, 'editref&'),
    refClient,
    refClientEditUrl: findActionUrl(html, 'editref_client'),
    thirdPartyName,
    thirdPartySocid,
    otherInvoicesUrl,
    projectLabel,
    projectEditUrl: findActionUrl(html, 'classify&'),
    statusLabel,
    statusBadgeNumber,
    secondaryStatusLabel,

    typeLabel,
    typeNote,
    discountInfo: findDiscountInfo(html),
    invoiceDate: findDetailValue(html, 'editdate&', 'Invoice date'),
    paymentTerms: findDetailValue(html, 'editconditions', 'Payment Terms'),
    paymentTermsEditUrl: findActionUrl(html, 'editconditions'),
    paymentDueOn: findDetailValue(html, 'editpaymentterm', 'Payment due on'),
    paymentDueOnEditUrl: findActionUrl(html, 'editpaymentterm'),
    paymentType: findDetailValue(html, 'editmode&', 'Payment Type'),
    paymentTypeEditUrl: findActionUrl(html, 'editmode&'),
    currencyLabel: findDetailValue(html, 'editmulticurrencycode', 'Currency'),
    bankAccount: findDetailValue(html, 'editbankaccount', 'Bank account'),
    bankAccountEditUrl: findActionUrl(html, 'editbankaccount'),
    incoterms: findDetailValue(html, 'editincoterm', 'Incoterms'),
    incotermsEditUrl: findActionUrl(html, 'editincoterm'),

    amountExclTax: (doc.querySelector('#amount-display-ht')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    vatAmount: (doc.querySelector('#amount-display-vat')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    amountInclTax: (doc.querySelector('#amount-display-ttc')?.textContent ?? '').replace(/\s+/g, ' ').trim(),

    zra: parseZraDetails(html),
    lines: parseInvoiceLines(doc),
    actions: parseActions(html),
    payments,
    alreadyPaid,
    billed,
    remainingUnpaid,
    docGenOptions: parseDocGenOptions(html),
    onlinePaymentUrl: (doc.querySelector<HTMLInputElement>('#onlinepaymenturl')?.value ?? '').trim(),
    grnDetails: parseGrnDetails(html),
    draftFormOptions: parseDraftFormOptions(doc),

    notesBadge: findTabBadge(html, 'note'),
    documentsBadge: findTabBadge(html, 'documents'),
    agendaBadge: findTabBadge(html, 'agenda'),
  }
}

export { parseAmount }
