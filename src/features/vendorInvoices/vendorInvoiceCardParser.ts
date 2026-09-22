// Parses fourn/facture/card.php?facid=X — Dolibarr's classic Vendor/Supplier
// Invoice card page. No detail page existed for this feature at all before
// this (only list/create/stats — see vendorInvoices.queries.ts's own header
// comment: the real create-flow API is confirmed broken, and no read/detail
// API was ever found either). Same scrape-the-real-page approach as the
// Sales Invoice rebuild (src/features/invoices/invoiceCardParser.ts), whose
// extraction helpers this is modeled directly on — this page shares the same
// real markup quirks (malformed nested-table rows, plain-text Ref/Ref.
// vendor lines). Selectors verified against a real fetched page (invoice
// facid=19, ref SI2604-0017), not guessed.
//
// Real differences from the Sales Invoice card, all confirmed live:
//  - "Ref. vendor" instead of "Ref. customer" (action=editref_supplier).
//  - Third-party links to /societe/card.php, not /comm/card.php.
//  - A real "Label" field (action=editlabel) with no Sales Invoice
//    equivalent.
//  - A "Zra Invoice Status" row exists structurally but is confirmed
//    essentially always empty (ZRA e-invoicing is a Zambian sales/output-tax
//    requirement, not applicable to purchases) — captured as a single
//    optional string, not a full 8-field block like the Sales Invoice's ZRA
//    card.
//  - Item Table lines are NOT static server-rendered <tr>s — same
//    client-side-grid pattern Sales Orders' commande/card.php uses
//    (orderCardParser.ts's parseExistingLines): a `var database_lines =
//    [...]` JSON blob in an inline <script>, carrying real lot/batch
//    tracking fields (lot_number/lot_eatby/lot_sellby/lot_warehouse_name)
//    the Sales Invoice's own item table doesn't have.
//  - A real 3-way "Shipment Details / Expenses / Landed Cost" sub-panel
//    (Bootstrap nav-tabs embedded directly in the card) — genuinely part of
//    this real page, unlike the Sales Invoice rebuild's removed
//    Shipment/GRN tab (which belonged to a different, abandoned custom
//    page).
//  - No Direct Debit Orders tab, no separate Events/Agenda tab (replaced by
//    a much simpler "Log" tab — see vendorInvoiceInfoParser.ts).

export interface VendorInvoiceLineRow {
  rowid: string
  productId: string | null
  productLabel: string
  fournRef: string
  vatRatePercent: string
  landedCost: boolean
  unitPriceExcl: string
  qty: string
  discountPercent: string
  totalIncl: string
  lotNumber: string
  lotEatBy: string
  lotSellBy: string
  lotWarehouseName: string
}

export interface VendorInvoiceAction {
  label: string
  url: string
}

export interface VendorInvoicePaymentRow {
  ref: string
  url: string
  date: string
  type: string
  bankAccount: string
  amount: string
}

export interface ShipmentDetailField {
  label: string
  value: string
}

export interface VendorInvoiceExtraPanels {
  shipmentFields: ShipmentDetailField[]
  expensesMessage: string
  landedCostMessage: string
}

export interface VendorInvoiceContactRow {
  nature: string
  thirdParty: string
  contact: string
  contactType: string
  status: string
}

export interface VendorInvoiceDetail {
  id: number
  ref: string
  refEditUrl: string
  refVendor: string
  refVendorEditUrl: string
  thirdPartyName: string
  thirdPartySocid: number | null
  otherInvoicesUrl: string
  projectLabel: string
  projectEditUrl: string
  statusLabel: string
  statusBadgeNumber: number | null
  secondaryStatusLabel: string
  cloneUrl: string
  deleteUrl: string
  deleteDisabledReason: string

  typeLabel: string
  discountInfo: string
  label: string
  labelEditUrl: string
  invoiceDate: string
  paymentTerms: string
  paymentTermsEditUrl: string
  zraStatus: string
  paymentDueOn: string
  paymentType: string
  paymentTypeEditUrl: string
  currencyLabel: string
  bankAccount: string
  bankAccountEditUrl: string
  incoterms: string
  incotermsEditUrl: string

  subtotal: string
  amountExclTax: string
  vatAmount: string
  amountInclTax: string

  lines: VendorInvoiceLineRow[]
  extraPanels: VendorInvoiceExtraPanels

  actions: VendorInvoiceAction[]

  payments: VendorInvoicePaymentRow[]
  alreadyPaid: string
  billed: string
  remainingUnpaid: string

  notesBadge: number
  documentsBadge: number
}

function stripTags(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// Ref/Ref. vendor render as plain text (not inside a <label>): `Ref. <a
// class="editfielda" href="...">...</a> : VALUE<br>Ref. vendor <a ...>...
// </a> : VALUE<br>Third-party : ...` — confirmed live, invoice facid=19.
function findRefLikeValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${escaped}\\s*<a class="editfielda"[\\s\\S]*?<\\/a>\\s*:\\s*([^<]*)<`)
  const m = re.exec(html)
  return (m?.[1] ?? '').trim()
}

// Each header/detail field's own real edit-pencil link carries the real
// Dolibarr action name (action=editref, action=editref_supplier,
// action=editlabel, action=classify, ...) — confirmed unique across the
// page, same convention as the Sales Invoice rebuild.
function findActionUrl(html: string, action: string): string {
  const m = html.match(new RegExp(`href="([^"]*action=${action}[^"]*)"`))
  return (m?.[1] ?? '').replace(/&amp;/g, '&')
}

// Third-party links to /societe/card.php?socid=X here (not /comm/card.php
// like the Sales Invoice's customer link) — confirmed live.
function findThirdParty(html: string): { name: string; socid: number | null } {
  const m = html.match(/Third-party\s*:\s*<a href="\/societe\/card\.php\?socid=(\d+)"[^>]*>([^<]*)<\/a>/)
  if (!m) return { name: '', socid: null }
  return { name: m[2].replace(/\s+/g, ' ').trim(), socid: Number(m[1]) }
}

// Same confirmed-broken-tag row shape as the Sales Invoice's Invoice Details
// table ("Bank account<td>" instead of "...</td><td>", "Payment Terms<td>"
// likewise) — the label sits in its own nested one-row
// `<table class="newCustomUItable">` (holding a real edit-pencil when the
// field is actually editable), and the value is the OUTER row's own next
// top-level <td>. Confirmed live for both editable rows (Label/Payment
// Terms/Payment Type/Bank account/Incoterms) and the two read-only ones
// (Invoice date, Currency).
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

// "Invoice date" and "Payment due on" are a genuinely flatter shape than
// every other Invoice Details row — a plain `<td>Label</td><td
// colspan="3">VALUE</td>` with no nested wrapper table at all (confirmed
// live) — so valueAfterNestedTable's "next </table>, then next <td>" logic
// doesn't apply and would walk into a completely unrelated later table.
// Both rows' own <tr> is also confirmed unclosed in the raw markup (a real
// defect — the next <tr> opens before this one's </tr>), so a real
// browser's own HTML5 table-parsing auto-recovery (implicitly closing the
// dangling <tr>/<td> at the next <tr>) is relied on here instead of
// text-anchored regex — read from the already-parsed Document, not the raw
// string, for exactly that recovery.
function findFlatDetailValue(doc: Document, label: string): string {
  const labelTd = Array.from(doc.querySelectorAll('td')).find((td) => td.children.length === 0 && (td.textContent ?? '').trim() === label)
  return (labelTd?.nextElementSibling?.textContent ?? '').trim()
}

function findDiscountInfo(html: string): string {
  const m = html.match(/Discounts<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/)
  return m ? stripTags(m[1]) : ''
}

// "Zra Invoice Status" row: confirmed always structurally present but its
// badge is confirmed empty on every real invoice sampled (ZRA e-invoicing
// only applies to sales/output tax, not purchases) — captured as a plain
// optional string rather than the Sales Invoice's full 8-field ZRA block.
function findZraStatus(html: string): string {
  const m = html.match(/Zra Invoice Status<\/td>[\s\S]*?class="badge[^"]*"[^>]*>([^<]*)<\/span>/)
  return (m?.[1] ?? '').trim()
}

interface RawVendorInvoiceLine {
  rowid: string
  fk_product: string
  product_label: string
  fourn_ref: string
  qty: string
  price_ht: string
  vat_rate: string
  discount_percent: string
  landed_cost: boolean
  multicurrency_price_ttc: string
  lot_number?: string
  lot_eatby?: string
  lot_sellby?: string
  lot_warehouse_name?: string
}

// Item Table lines are rendered client-side (a "supplierInvoiceManager" JS
// grid, confirmed live via its own onclick handlers) — the real line data
// ships as `var database_lines = [...]`, a single-line JSON array embedded
// in an inline <script>, same mechanism as Sales Orders' own `existingLines`
// (orderCardParser.ts). Extracted by bracket-matching from the `[` right
// after `=` rather than a lazy regex, since product descriptions can
// contain `];`. Only real fields the raw JSON actually carries are mapped —
// there is no separate "unit price incl. tax" field (multicurrency_price_ttc
// is confirmed to be the real LINE TOTAL incl. tax, not a per-unit price:
// qty=10 × price_ht 172.4138 = 1724.138 excl., and
// multicurrency_price_ttc=2000.00 matches the invoice's own Amount
// (inc. tax) exactly for this single-line sample) — no per-unit-incl-tax
// value is fabricated here.
function parseVendorInvoiceLines(html: string): VendorInvoiceLineRow[] {
  const anchor = html.indexOf('var database_lines = ')
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
  let raw: RawVendorInvoiceLine[]
  try {
    raw = JSON.parse(html.slice(start, end + 1))
  } catch {
    return []
  }
  return raw.map((l) => ({
    rowid: String(l.rowid ?? ''),
    productId: l.fk_product && l.fk_product !== '0' ? String(l.fk_product) : null,
    productLabel: l.product_label ?? '',
    fournRef: l.fourn_ref ?? '',
    vatRatePercent: l.vat_rate ?? '',
    landedCost: Boolean(l.landed_cost),
    unitPriceExcl: l.price_ht ?? '',
    qty: l.qty ?? '',
    discountPercent: l.discount_percent ?? '0',
    totalIncl: l.multicurrency_price_ttc ?? '',
    lotNumber: l.lot_number ?? '',
    lotEatBy: l.lot_eatby ?? '',
    lotSellBy: l.lot_sellby ?? '',
    lotWarehouseName: l.lot_warehouse_name ?? '',
  }))
}

// The real 3-way "Shipment Details / Expenses / Landed Cost" sub-panel
// (Bootstrap nav-tabs embedded directly in the card, separate from the main
// 6-tab bar) — confirmed live, invoice facid=19: Shipment Details renders 9
// real fields as `<div class="card border-0 bg-light ..."><small
// class="text-muted d-block">LABEL</small><strong>VALUE</strong></div>`
// blocks (a clean, generic label/value shape — extracted positionally, not
// by fixed field names, so it naturally handles however many real fields
// are actually populated). Expenses/Landed Cost each show a single real
// message paragraph (either a real linked reference, or a real "none yet"
// message when absent — both are genuine backend text, not fabricated).
function parseExtraPanels(html: string): VendorInvoiceExtraPanels {
  const shipIdx = html.indexOf('id="disp-ship"')
  const expIdx = html.indexOf('id="disp-exp"')
  const lcIdx = html.indexOf('id="disp-lc"')

  const shipmentFields: ShipmentDetailField[] = []
  if (shipIdx !== -1) {
    const block = html.slice(shipIdx, expIdx === -1 ? shipIdx + 6000 : expIdx)
    const doc = new DOMParser().parseFromString(block, 'text/html')
    doc.querySelectorAll('.card.border-0.bg-light').forEach((card) => {
      const label = (card.querySelector('small')?.textContent ?? '').trim()
      const value = (card.querySelector('strong')?.textContent ?? '').trim()
      if (label) shipmentFields.push({ label, value })
    })
  }

  function tabPaneMessage(startIdx: number, endIdx: number): string {
    if (startIdx === -1) return ''
    const pStart = html.indexOf('<p', startIdx)
    const pEnd = html.indexOf('</p>', pStart)
    if (pStart === -1 || pEnd === -1 || (endIdx !== -1 && pStart > endIdx)) return ''
    return stripTags(html.slice(pStart, pEnd + 4))
  }

  return {
    shipmentFields,
    expensesMessage: tabPaneMessage(expIdx, lcIdx),
    landedCostMessage: tabPaneMessage(lcIdx, -1),
  }
}

// Bottom action-button row: real plain GET links (Send email, Clone) plus
// one JS-only modal button ("Update To Zra", no plain URL — omitted, same
// reasoning as the Sales Invoice rebuild's own WhatsApp button). No credit
// note / POS ticket buttons here — those are sales-only.
function parseActions(html: string): VendorInvoiceAction[] {
  const start = html.indexOf('class="tabsAction')
  if (start === -1) return []
  const end = html.indexOf('nav-tabs', start)
  const block = end === -1 ? html.slice(start, start + 4000) : html.slice(start, end)
  const anchorRe = /<a[^>]*class="butAction[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g
  const actions: VendorInvoiceAction[] = []
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(block))) {
    const label = m[2].trim()
    if (!label) continue
    actions.push({ label, url: m[1].replace(/&amp;/g, '&') })
  }
  return actions
}

// Header Clone/Delete icons — Delete is real but often disabled once the
// invoice has been posted to accounting (confirmed live: `class="butAction
// Refused" href="#" title="Disabled because invoice was dispatched into
// bookkeeping"` — a genuinely useful state, surfaced as a reason string
// rather than just hiding the button).
function findHeaderIconActions(html: string): { cloneUrl: string; deleteUrl: string; deleteDisabledReason: string } {
  const cloneUrl = findActionUrl(html, 'clone')
  const refusedMatch = html.match(/class="butActionRefused[^"]*"[^>]*href="#"[^>]*title="([^"]*)"/)
  const deleteMatch = html.match(/href="([^"]*action=delete[^"]*)"/)
  return {
    cloneUrl,
    deleteUrl: deleteMatch ? deleteMatch[1].replace(/&amp;/g, '&') : '',
    deleteDisabledReason: refusedMatch ? stripTags(refusedMatch[1]) : '',
  }
}

// Payment Details: identical shape to the Sales Invoice rebuild (real table
// right after the `<span class="paymenttitle...">Payment Details</span>`
// marker, real rows carry class="oddeven" with a ref link to
// /fourn/paiement/card.php — a different path than the Sales Invoice's own
// /compta/paiement/, but the same 3 fixed summary rows: Already
// paid/Billed/Remaining unpaid).
function parsePaymentDetails(html: string): { payments: VendorInvoicePaymentRow[]; alreadyPaid: string; billed: string; remainingUnpaid: string } {
  const titleIdx = html.indexOf('paymenttitle')
  if (titleIdx === -1) return { payments: [], alreadyPaid: '', billed: '', remainingUnpaid: '' }
  const tableStart = html.lastIndexOf('<table', titleIdx)
  const tableEnd = html.indexOf('</table>', titleIdx)
  if (tableStart === -1 || tableEnd === -1) return { payments: [], alreadyPaid: '', billed: '', remainingUnpaid: '' }
  const block = html.slice(tableStart, tableEnd + '</table>'.length)
  const doc = new DOMParser().parseFromString(block, 'text/html')

  const payments: VendorInvoicePaymentRow[] = Array.from(doc.querySelectorAll('tr.oddeven')).map((row) => {
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

  // This page's own "Already paid" cell carries a genuine, real markup
  // defect — a duplicate `class` attribute (`<td class="right"
  // class="amountalreadypaid">`, confirmed live) — an HTML5 parser keeps
  // only the first `class` occurrence, so `.amountalreadypaid` never
  // matches in the parsed Document. Read by label text instead, same
  // technique already used for "Billed" on the Sales Invoice rebuild.
  const alreadyPaidMatch = block.match(/Already paid[^<]*<\/span>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/)
  const alreadyPaid = alreadyPaidMatch ? stripTags(alreadyPaidMatch[1]) : ''
  const remainingUnpaid = (doc.querySelector('.amountpaymentcomplete')?.textContent ?? '').trim()
  const billedMatch = block.match(/Billed<\/span>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/)
  const billed = billedMatch ? stripTags(billedMatch[1]) : ''

  return { payments, alreadyPaid, billed, remainingUnpaid }
}

// contact.php: a genuinely different table shape than Sales Orders'/the
// Sales Invoice's Contacts tab — this table's real class combo is
// `newCustomUItable border1important mt-3` (missing `table-bordered`,
// confirmed live), so orderExtraTabsParser.ts's parseOrderContactsHtml
// selector (`mt-3` AND `table-bordered`) would not match it. No real
// non-empty sample exists on this backend yet (same situation Sales
// Orders' own Contacts tab was already in) — cells read generically by
// position.
export function parseVendorInvoiceContactsHtml(html: string): VendorInvoiceContactRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = Array.from(doc.querySelectorAll('table')).find((t) => t.classList.contains('newCustomUItable') && t.classList.contains('mt-3'))
  if (!table) return []
  const rows = Array.from(table.querySelectorAll('tr')).filter((r) => !r.querySelector('th'))
  return rows.map((r) => {
    const cells = r.querySelectorAll('td')
    return {
      nature: (cells[0]?.textContent ?? '').trim(),
      thirdParty: (cells[1]?.textContent ?? '').trim(),
      contact: (cells[2]?.textContent ?? '').trim(),
      contactType: (cells[3]?.textContent ?? '').trim(),
      status: (cells[4]?.textContent ?? '').trim(),
    }
  })
}

// Tab labels carry their own real badge count directly (`Notes<span
// class="badge ...">N</span>`), omitted at zero — same convention already
// confirmed on the Sales Invoice rebuild.
function findTabBadge(html: string, tabId: string): number {
  const re = new RegExp(`<a id="${tabId}"[^>]*>[^<]*<span class="badge[^"]*">(\\d+)</span>`)
  const m = re.exec(html)
  return m ? Number(m[1]) : 0
}

export function parseVendorInvoiceCardHtml(html: string, id: number): VendorInvoiceDetail {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const ref = findRefLikeValue(html, 'Ref.')
  const refVendor = findRefLikeValue(html, 'Ref. vendor')
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
  const { cloneUrl, deleteUrl, deleteDisabledReason } = findHeaderIconActions(html)

  const typeMatch = html.match(/class="titlefield">Type<\/td>\s*<td>\s*<span class="badgeneutral">([^<]*)<\/span>/)
  const { payments, alreadyPaid, billed, remainingUnpaid } = parsePaymentDetails(html)

  return {
    id,
    ref,
    refEditUrl: findActionUrl(html, 'editref&'),
    refVendor,
    refVendorEditUrl: findActionUrl(html, 'editref_supplier'),
    thirdPartyName,
    thirdPartySocid,
    otherInvoicesUrl,
    projectLabel,
    projectEditUrl: findActionUrl(html, 'classify&'),
    statusLabel,
    statusBadgeNumber,
    secondaryStatusLabel,
    cloneUrl,
    deleteUrl,
    deleteDisabledReason,

    typeLabel: (typeMatch?.[1] ?? '').trim(),
    discountInfo: findDiscountInfo(html),
    label: findDetailValue(html, 'editlabel', 'Label'),
    labelEditUrl: findActionUrl(html, 'editlabel'),
    invoiceDate: findFlatDetailValue(doc, 'Invoice date'),
    paymentTerms: findDetailValue(html, 'editconditions', 'Payment Terms'),
    paymentTermsEditUrl: findActionUrl(html, 'editconditions'),
    zraStatus: findZraStatus(html),
    paymentDueOn: findFlatDetailValue(doc, 'Payment due on'),
    paymentType: findDetailValue(html, 'editmode&', 'Payment Type'),
    paymentTypeEditUrl: findActionUrl(html, 'editmode&'),
    currencyLabel: findPlainDetailValue(html, 'Currency'),
    bankAccount: findDetailValue(html, 'editbankaccount', 'Bank account'),
    bankAccountEditUrl: findActionUrl(html, 'editbankaccount'),
    incoterms: findDetailValue(html, 'editincoterm', 'Incoterms'),
    incotermsEditUrl: findActionUrl(html, 'editincoterm'),

    subtotal: (doc.querySelector('#subtotal_disp')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    amountExclTax: (doc.querySelector('#amount-display-ht')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    vatAmount: (doc.querySelector('#amount-display-vat')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    amountInclTax: (doc.querySelector('#amount-display-ttc')?.textContent ?? '').replace(/\s+/g, ' ').trim(),

    lines: parseVendorInvoiceLines(html),
    extraPanels: parseExtraPanels(html),
    actions: parseActions(html),
    payments,
    alreadyPaid,
    billed,
    remainingUnpaid,

    notesBadge: findTabBadge(html, 'note'),
    documentsBadge: findTabBadge(html, 'documents'),
  }
}
