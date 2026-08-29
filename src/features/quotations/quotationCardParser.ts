// Parses comm/propal/card.php?id=X — a classic server-rendered Dolibarr
// page. No JSON API exists for reading an existing quotation (the real
// comm/propal/api/proposal_handler.php only covers create-flow actions —
// confirmed by reading that file directly), so this scrapes the real page
// the same way purchaseOrderCardParser.ts does for Purchase Orders.
// Selectors/label text below were read directly from card.php's real
// source and the real en_US lang files — not guessed.
//
// Unlike Purchase Orders' info tables (`table.table-borderless`), this
// page's own info tables use a different class (`table.newCustomUItable`)
// — findRowValue() below searches every <tr> in the document rather than
// scoping to one table class, so it isn't tied to either page's specific
// markup.

import { parseStatusCode } from './quotationListParser'

export interface QuotationLineDetail {
  id: number
  productId: number
  productLabel: string
  description: string
  qty: number
  unitPriceExcl: number
  vatRate: number
  vatCode: string
  discountValue: number
  discountType: '1' | '2'
  buyingPrice: number
  totalHt: number
  totalTva: number
  totalTtc: number
}

export interface QuotationDocOption {
  value: string
  label: string
}
export interface QuotationDocGenOptions {
  token: string
  modelOptions: QuotationDocOption[]
  langOptions: QuotationDocOption[]
  defaultLang: string
}
export interface QuotationLinkedFile {
  name: string
  url: string
}

// Every condition here is read directly from card.php's own action-buttons
// block (fk_statut only — the usercan* permission flags all end up true for
// this deployment's own admin user, not modeled separately).
export interface QuotationAvailableActions {
  canValidate: boolean
  canModify: boolean
  canReopen: boolean
  canSendMail: boolean
  canCloseAsAcceptedRefused: boolean
  canCreateOrder: boolean
  canCreateIntervention: boolean
  canCreateContract: boolean
  canCreateInvoice: boolean
  canClassifyBilled: boolean
  canClone: boolean
  canDelete: boolean
}

// "Related Objects" — Form::showLinkedObjectBlock(), a generic Dolibarr
// widget shared by every document type (not propal-specific), read directly
// from that function's real source. It renders a
// `table[data-block="showLinkedObject"]` with a fixed 7-column header
// (Type/Ref/[picto]/Date/AmountHTShort/Status/[unlink]) whatever the linked
// object type — the per-type row content underneath comes from that type's
// own linkedobjectblock.tpl.php include, so rows are read generically by
// position rather than assuming one type's exact inner markup.
export interface RelatedObjectRow {
  type: string
  ref: string
  url: string
  date: string
  amount: number
  statusLabel: string
  unlinkUrl: string
}

// "Margin Details" — FormMargin::displayMarginInfos(), read directly from
// its real source (core/class/html.formmargin.class.php). Only rendered at
// all when the user has margins->liretous rights; the "Total Margin" row
// only exists when both the product AND service modules are enabled (both
// true on this deployment, per the real screenshot showing all 3 rows).
export interface MarginRow {
  label: string
  sellingPrice: number
  costPrice: number
  margin: number
}

// FormActions::showactions($object, 'propal', $socid, 1) — the same
// generic "Latest linked events" mini-widget already parsed for Sales
// Orders (see orderCardParser.ts's parseLinkedEvents(), read directly from
// that identical Dolibarr function) — reused here by the same technique
// rather than re-derived, since it's the same shared code path, not
// anything propal-specific.
export interface LatestLinkedEventRow {
  ref: string
  url: string
  date: string
  by: string
  type: string
  title: string
}

export interface QuotationCard {
  id: number
  ref: string
  refCustomer: string
  thirdPartyName: string
  socid: number | null
  projectRef: string
  projectId: number | null
  statusLabel: string
  statusCode: number | null
  discountsText: string
  date: string
  validityEndingDate: string
  paymentTerms: string
  deliveryDate: string
  availabilityDelay: string
  shippingMethod: string
  source: string
  paymentType: string
  currency: string
  bankAccount: string
  calculatedWeight: string
  incotermLabel: string
  amountHt: number
  amountVat: number
  amountTtc: number
  lines: QuotationLineDetail[]
  docGen: QuotationDocGenOptions
  linkedFiles: QuotationLinkedFile[]
  relatedObjects: RelatedObjectRow[]
  marginRows: MarginRow[]
  latestLinkedEvents: LatestLinkedEventRow[]
  actions: QuotationAvailableActions
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}
function parseAmount(raw: string): number {
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function findRowValue(doc: Document, label: string): Element | null {
  const rows = doc.querySelectorAll('tr')
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll(':scope > td'))
    if (cells.length < 2) continue
    if (text(cells[0]).startsWith(label)) return cells[cells.length - 1]
  }
  return null
}

interface RawExistingLine {
  id: number
  fk_product?: number | string
  product_label?: string
  desc?: string
  qty?: number | string
  subprice?: number | string
  tva_tx?: number | string
  default_vat_code?: string
  remise_percent?: number | string
  remise_amount?: number | string
  dis_type?: number | string
  pa_ht?: number | string
  total_ht?: number
  total_tva?: number
  total_ttc?: number
}

// `var existingLines = [...];` — extracted by bracket-matching from the `[`
// right after the `=`, same technique as Sales/Purchase Orders' own card
// parsers, since product/description text can itself contain `];`. Field
// names read directly from card.php's own $existingLines construction.
function parseExistingLines(html: string): QuotationLineDetail[] {
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
  return raw.map((l) => {
    const discountType: '1' | '2' = Number(l.dis_type) === 2 ? '2' : '1'
    return {
      id: Number(l.id) || 0,
      productId: Number(l.fk_product) || 0,
      productLabel: l.product_label ?? '',
      description: l.desc ?? '',
      qty: Number(l.qty) || 0,
      unitPriceExcl: Number(l.subprice) || 0,
      vatRate: Number(l.tva_tx) || 0,
      vatCode: l.default_vat_code ?? '',
      discountValue: discountType === '2' ? Number(l.remise_amount) || 0 : Number(l.remise_percent) || 0,
      discountType,
      buyingPrice: Number(l.pa_ht) || 0,
      totalHt: Number(l.total_ht) || 0,
      totalTva: Number(l.total_tva) || 0,
      totalTtc: Number(l.total_ttc) || 0,
    }
  })
}

// Same generic Dolibarr FormFile::showdocuments() output already parsed for
// Warehouses/Purchase Orders (#builddoc_form/#builddoc_generatebutton
// markup is element-agnostic — this page calls it with
// element='propal' instead).
function parseDocGenAndFiles(doc: Document): { docGen: QuotationDocGenOptions; linkedFiles: QuotationLinkedFile[] } {
  const generateBtn = doc.querySelector('#builddoc_generatebutton')
  const controlRow = generateBtn?.closest('tr') ?? null
  const fileRows: Element[] = []
  let sib = controlRow?.nextElementSibling ?? null
  while (sib && sib.tagName === 'TR') {
    fileRows.push(sib)
    sib = sib.nextElementSibling
  }
  const linkedFiles: QuotationLinkedFile[] = fileRows
    .map((row) => {
      const rowText = text(row)
      if (!rowText || rowText.toLowerCase() === 'none') return null
      const link = row.querySelector('a')
      if (link) return { name: text(link), url: link.getAttribute('href') ?? '' }
      return { name: rowText, url: '' }
    })
    .filter((f): f is QuotationLinkedFile => !!f)

  const builddocForm = doc.querySelector('#builddoc_form')
  const token = builddocForm?.querySelector('input[name="token"]')?.getAttribute('value') ?? ''
  const modelSelect = builddocForm?.querySelector('select[name="model"]')
  const modelOptions: QuotationDocOption[] = Array.from(modelSelect?.querySelectorAll('option') ?? []).map((o) => ({
    value: o.getAttribute('value') ?? '',
    label: text(o),
  }))
  const langSelect = builddocForm?.querySelector('select#lang_id')
  const langOptions: QuotationDocOption[] = Array.from(langSelect?.querySelectorAll('option') ?? []).map((o) => ({
    value: o.getAttribute('value') ?? '',
    label: text(o),
  }))
  const defaultLang = langSelect?.querySelector('option[selected]')?.getAttribute('value') ?? langOptions[0]?.value ?? 'en_US'

  return { docGen: { token, modelOptions, langOptions, defaultLang }, linkedFiles }
}

// table[data-block="showLinkedObject"] — see RelatedObjectRow's header
// comment. The "None" placeholder row (`<tr><td class="opacitymedium">`)
// has no <a>, so filtering on the ref link's presence handles that case the
// same way this feature's other tables treat their own empty states.
function parseRelatedObjects(doc: Document): RelatedObjectRow[] {
  const table = doc.querySelector('table[data-block="showLinkedObject"]')
  if (!table) return []
  const rows = Array.from(table.querySelectorAll('tr')).filter((r) => !r.classList.contains('tbold'))
  const result: RelatedObjectRow[] = []
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll(':scope > td'))
    const refLink = row.querySelector('a[href*="card.php?id="]')
    if (!refLink) continue
    const unlinkLink = row.querySelector('a[href*="action=dellink"], a.reposition[href*="dellink"], a[href*="linkid="]')
    result.push({
      type: text(cells[0]),
      ref: text(refLink),
      url: refLink.getAttribute('href') ?? '',
      date: text(cells[3]),
      amount: parseAmount(text(cells[4])),
      statusLabel: text(cells[5]),
      unlinkUrl: unlinkLink?.getAttribute('href') ?? '',
    })
  }
  return result
}

// See MarginRow's header comment for the real source this mirrors. Rows are
// matched by their own known label text ("Margin On Products"/"Margin On
// Services"/"Total Margin" — read from the real langs/en_US/margins.lang
// keys these render) rather than position, since the Products/Services
// rows are each independently conditional on their own module being
// enabled.
function parseMarginDetails(doc: Document): MarginRow[] {
  const marginsHeader = Array.from(doc.querySelectorAll('td.liste_titre')).find((td) => text(td) === 'Margins')
  const table = marginsHeader?.closest('table')
  if (!table) return []
  const rows = Array.from(table.querySelectorAll('tr')).filter((r) => !r.querySelector('td.liste_titre'))
  return rows.map((row) => {
    const cells = Array.from(row.querySelectorAll(':scope > td'))
    return {
      label: text(cells[0]),
      sellingPrice: parseAmount(text(cells[1])),
      costPrice: parseAmount(text(cells[2])),
      margin: parseAmount(text(cells[3])),
    }
  })
}

// FormActions::showactions() — same generic widget/technique as Sales
// Orders' own parseLinkedEvents() (orderCardParser.ts), reused here rather
// than re-derived since it's the identical shared Dolibarr code path.
function parseLatestLinkedEvents(html: string): LatestLinkedEventRow[] {
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
      ref: text(refLink) || text(cells[0]),
      url: refLink?.getAttribute('href') ?? '',
      date: text(cells[1]),
      by: text(cells[2]?.querySelector('.usertext')) || text(cells[2]),
      type: text(cells[3]),
      title: text(cells[4]),
    }
  })
}

function computeActions(statusCode: number | null): QuotationAvailableActions {
  const s = statusCode
  return {
    canValidate: s === 0,
    canModify: s === 1,
    canReopen: s === 2 || s === 3 || s === 4,
    canSendMail: s === 1 || s === 2,
    canCloseAsAcceptedRefused: s === 1,
    canCreateOrder: s === 2,
    canCreateIntervention: s === 2,
    canCreateContract: s === 2,
    canCreateInvoice: s === 2,
    canClassifyBilled: s === 2,
    canClone: true,
    canDelete: true,
  }
}

export function parseQuotationCard(html: string, id: number): QuotationCard {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const ref = text(doc.querySelector('.refidno-sub h3'))

  const thirdPartyAnchor = doc.querySelector('.refidno-sub a[href*="comm/card.php?socid="]')
  const socidMatch = thirdPartyAnchor?.getAttribute('href')?.match(/socid=(\d+)/)
  const socid = socidMatch ? Number(socidMatch[1]) : null
  const thirdPartyName = thirdPartyAnchor
    ? Array.from(thirdPartyAnchor.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim() || text(thirdPartyAnchor)
    : ''

  const projectAnchor = doc.querySelector('.refidno-sub a[href*="/projet/card.php?id="]')
  const projectIdMatch = projectAnchor?.getAttribute('href')?.match(/[?&]id=(\d+)/)

  // RefCustomer lives in the banner ($morehtmlref via editfieldkey/
  // editfieldval), not the info table below it — best-effort regex against
  // the banner's own markup rather than a DOM selector, since
  // editfieldval()'s exact wrapper tag isn't fixed across Dolibarr's own
  // call sites.
  const bannerHtml = doc.querySelector('.refidno-sub')?.innerHTML ?? ''
  const refCustomer = (bannerHtml.match(/Ref\.\s*customer\s*<\/[^>]+>\s*(?:<[^>]+>\s*)*([^<]+)/i)?.[1] ?? '').trim()

  // Status: Propal::LibStatut() renders one of a small, known set of
  // English badge labels (see quotationListParser.ts's STATUS_LABELS) —
  // matched by scanning every ".badge" element for the first whose text
  // resolves to a known status, same robust approach as Purchase Orders'
  // card parser.
  let statusLabel = ''
  let statusCode: number | null = null
  for (const badge of Array.from(doc.querySelectorAll('.badge'))) {
    const t = text(badge)
    const code = parseStatusCode(t.replace(/\s*\(needs billing\)/i, '').replace(/\s*\(needs to be validated\)/i, ''))
    if (code !== null) {
      statusLabel = t
      statusCode = code
      break
    }
  }

  const lines = parseExistingLines(html)
  const { docGen, linkedFiles } = parseDocGenAndFiles(doc)
  const relatedObjects = parseRelatedObjects(doc)
  const marginRows = parseMarginDetails(doc)
  const latestLinkedEvents = parseLatestLinkedEvents(html)

  return {
    id,
    ref,
    refCustomer,
    thirdPartyName,
    socid,
    projectRef: text(projectAnchor),
    projectId: projectIdMatch ? Number(projectIdMatch[1]) : null,
    statusLabel,
    statusCode,
    discountsText: text(findRowValue(doc, 'Discounts')),
    date: text(findRowValue(doc, 'Date')),
    validityEndingDate: text(findRowValue(doc, 'Validity ending date')),
    paymentTerms: text(findRowValue(doc, 'Payment Terms')),
    deliveryDate: text(findRowValue(doc, 'Delivery date')),
    availabilityDelay: text(findRowValue(doc, 'Availability delay')),
    shippingMethod: text(findRowValue(doc, 'Shipping method')),
    source: text(findRowValue(doc, 'Source')),
    paymentType: text(findRowValue(doc, 'Payment Type')),
    currency: text(findRowValue(doc, 'Currency')),
    bankAccount: text(findRowValue(doc, 'Bank account')),
    calculatedWeight: text(findRowValue(doc, 'Calculated weight')),
    incotermLabel: text(findRowValue(doc, 'Incoterms')),
    amountHt: parseAmount(text(findRowValue(doc, 'Amount (excl. tax)'))),
    amountVat: parseAmount(text(findRowValue(doc, 'VAT'))),
    amountTtc: parseAmount(text(findRowValue(doc, 'Amount (inc. tax)'))),
    lines,
    docGen,
    linkedFiles,
    relatedObjects,
    marginRows,
    latestLinkedEvents,
    actions: computeActions(statusCode),
  }
}
