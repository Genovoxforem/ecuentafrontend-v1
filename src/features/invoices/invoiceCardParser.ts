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
  vatRatePercent: string
  landedCost: string
  unitPriceExcl: string
  unitPriceIncl: string
  qty: string
  discountPercent: string
  costPrice: string
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

// Ref/Ref. customer render as plain text (not inside a <label>, unlike Sales
// Orders' equivalent): `Ref. <a class="editfielda" href="...">...</a> :
// VALUE<a onclick=loadzradetails()>...` for Ref specifically (a ZRA-portal
// shortcut icon sits right after the value, so this stops at the next `<`
// rather than assuming `<br>` follows), `Ref. customer <a ...>...</a> :
// VALUE<br>` for the rest — confirmed live, invoice facid=418.
function findRefLikeValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${escaped}\\s*<a class="editfielda"[\\s\\S]*?<\\/a>\\s*:\\s*([^<]*)<`)
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

function findThirdParty(html: string): { name: string; socid: number | null } {
  const m = html.match(/Third-party\s*:\s*<a href="\/comm\/card\.php\?socid=(\d+)"[^>]*>([^<]*)<\/a>/)
  if (!m) return { name: '', socid: null }
  return { name: m[2].replace(/\s+/g, ' ').trim(), socid: Number(m[1]) }
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
    return {
      rowid: row.getAttribute('data-id') ?? '',
      productId: idMatch ? idMatch[1] : null,
      productUrl: productLink?.getAttribute('href') ?? '',
      label: (labelCell?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      vatRatePercent: (row.querySelector('.linecolvat .flex-fill')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      landedCost: (row.querySelector('.linecolrefsupplier')?.textContent ?? '').trim(),
      unitPriceExcl: (row.querySelector('.linecoluht')?.textContent ?? '').trim(),
      unitPriceIncl: (row.querySelector('.linecoluttc')?.textContent ?? '').trim(),
      qty: (row.querySelector('.linecolqty')?.textContent ?? '').trim(),
      discountPercent: (row.querySelector('.linecoldiscount')?.textContent ?? '').replace(/ /g, '').trim(),
      costPrice: (row.querySelector('.linecolmargin1')?.textContent ?? '').trim(),
      totalIncl: (row.querySelector('.linecolht')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    }
  })
}

// Bottom action-button row (`<div class="tabsAction d-flex">`): real plain
// GET links (Send email, POS Ticket, Create credit note, Clone) plus one
// JS-only button (Send WhatsApp, calls WhatsAppSender.sendInvoice(id) with
// no plain URL equivalent — omitted here, same reasoning Sales Orders uses
// for its own modal-only buttons: don't fabricate an unverified URL for a
// mutating action). POS Ticket only renders when the invoice actually came
// from a POS terminal — its absence is the real "not a POS sale" case.
function parseActions(html: string): InvoiceAction[] {
  const start = html.indexOf('class="tabsAction')
  if (start === -1) return []
  const end = html.indexOf('class="fichecenter', start)
  const block = end === -1 ? html.slice(start, start + 4000) : html.slice(start, end)
  const anchorRe = /<a[^>]*class="butAction[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g
  const actions: InvoiceAction[] = []
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(block))) {
    const label = m[2].trim()
    if (!label) continue
    actions.push({ label, url: m[1].replace(/&amp;/g, '&') })
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

    notesBadge: findTabBadge(html, 'note'),
    documentsBadge: findTabBadge(html, 'documents'),
    agendaBadge: findTabBadge(html, 'agenda'),
  }
}

export { parseAmount }
