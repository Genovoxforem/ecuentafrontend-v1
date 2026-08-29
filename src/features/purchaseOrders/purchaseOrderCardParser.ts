// Parses fourn/commande/card.php?id=X — a classic server-rendered Dolibarr
// page. No JSON API exists for reading an existing purchase order (the real
// commande/purchaseorder/api/purchase_handler.php only covers the
// create-flow actions — confirmed by reading that file directly), so this
// scrapes the real page the same way orderCardParser.ts does for Sales
// Orders. Selectors/label text below were read directly out of the real
// card.php PHP source and the real en_US lang files (orders.lang,
// bills.lang, main.lang, sendings.lang) — not guessed.
//
// This page's Item Table is a client-side grid (same pattern as Sales
// Orders' OrderManager) — its real line data is embedded as a JSON array in
// an inline <script> (`var database_lines = [...]`, built from
// $object->lines by purchase_order_line_form.php) rather than present as
// static <tr> markup. Parsed here the same bracket-matching way
// orderCardParser.ts's parseExistingLines() does, since product/description
// text can itself contain `];` and break a lazy regex.

import { parseStatusCode } from './purchaseOrderListParser'

export interface PurchaseOrderLineDetail {
  id: number
  productId: number
  productLabel: string
  description: string
  supplierRef: string
  qty: number
  unitPriceExcl: number
  vatRate: number
  vatCode: string
  discountPercent: number
  totalHt: number
  totalTva: number
  totalTtc: number
}

export interface PurchaseOrderDocOption {
  value: string
  label: string
}

export interface PurchaseOrderDocGenOptions {
  token: string
  modelOptions: PurchaseOrderDocOption[]
  langOptions: PurchaseOrderDocOption[]
  defaultLang: string
}

export interface PurchaseOrderLinkedFile {
  name: string
  url: string
}

// Every one of these real, per-status conditions was read directly from
// card.php's own action-buttons block (not guessed) — see this feature's
// queries file for the exact line-by-line source this mirrors.
export interface PurchaseOrderAvailableActions {
  canSendMail: boolean
  canReopen: boolean
  canCreateReception: boolean
  canClassifyReception: boolean
  canCreateBill: boolean
  canClassifyBilled: boolean
  canClone: boolean
  canDelete: boolean
}

export interface PurchaseOrderCard {
  id: number
  ref: string
  refSupplier: string
  thirdPartyName: string
  socid: number | null
  projectRef: string
  projectId: number | null
  statusLabel: string
  statusCode: number | null
  billed: boolean
  date: string
  method: string
  requestAuthor: string
  discountsText: string
  paymentTermsLabel: string
  paymentTypeLabel: string
  currencyLabel: string
  deliveryDate: string
  noDaysToDelivery: string
  incotermLabel: string
  amountHt: number
  amountVat: number
  amountTtc: number
  lines: PurchaseOrderLineDetail[]
  docGen: PurchaseOrderDocGenOptions
  linkedFiles: PurchaseOrderLinkedFile[]
  actions: PurchaseOrderAvailableActions
}

export function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(raw: string): number {
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

// The main "Purchase Order" tab's left/right info tables are both plain
// `<table class="table table-borderless ...">` blocks of `<tr><td>Label
// [+edit icon]</td><td>Value</td></tr>` rows (the edit-icon variants nest an
// extra table *inside* the first <td>, but that <tr> still only has 2
// top-level <td>s) — read directly from card.php's real source for every
// field below. Matched by the row's first cell *starting with* the known
// English label text (rather than exact-equals), since several rows also
// carry a trailing "&nbsp;" + info/edit icon in that same cell.
export function findRowValue(doc: Document, label: string): Element | null {
  const rows = doc.querySelectorAll('table.table-borderless tr')
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll(':scope > td'))
    if (cells.length < 2) continue
    if (text(cells[0]).startsWith(label)) return cells[cells.length - 1]
  }
  return null
}

interface RawDatabaseLine {
  id: number
  fk_product?: number | string
  product_label?: string
  desc?: string
  fourn_ref?: string
  qty?: number | string
  price_ht?: number | string
  vat_rate_num?: number | string
  vat_code?: string
  remise_percent?: number | string
  total_ht?: number
  total_tva?: number
  total_ttc?: number
}

// `var database_lines = [...];` — extracted by bracket-matching from the `[`
// right after the `=`, same technique as orderCardParser.ts's
// parseExistingLines(), since product/description text can itself contain
// `];`. card.php's own JS omits nothing when there are zero lines (it still
// emits `database_lines = [];`), so an empty array here is a real "no
// lines" state, not a parse failure.
function parseDatabaseLines(html: string): PurchaseOrderLineDetail[] {
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
  let raw: RawDatabaseLine[]
  try {
    raw = JSON.parse(html.slice(start, end + 1))
  } catch {
    return []
  }
  return raw.map((l) => ({
    id: Number(l.id) || 0,
    productId: Number(l.fk_product) || 0,
    productLabel: l.product_label ?? '',
    description: l.desc ?? '',
    supplierRef: l.fourn_ref ?? '',
    qty: Number(l.qty) || 0,
    unitPriceExcl: Number(l.price_ht) || 0,
    vatRate: Number(l.vat_rate_num) || 0,
    vatCode: l.vat_code ?? '',
    discountPercent: Number(l.remise_percent) || 0,
    totalHt: Number(l.total_ht) || 0,
    totalTva: Number(l.total_tva) || 0,
    totalTtc: Number(l.total_ttc) || 0,
  }))
}

// Same generic Dolibarr FormFile::showdocuments() output already parsed for
// Warehouses (see warehouseHtmlParser.ts's parseWarehouseEventsDocument) —
// #builddoc_form/#builddoc_generatebutton markup is element-agnostic, this
// page just calls it with element='commande_fournisseur' instead.
function parseDocGenAndFiles(doc: Document): { docGen: PurchaseOrderDocGenOptions; linkedFiles: PurchaseOrderLinkedFile[] } {
  const generateBtn = doc.querySelector('#builddoc_generatebutton')
  const controlRow = generateBtn?.closest('tr') ?? null
  const fileRows: Element[] = []
  let sib = controlRow?.nextElementSibling ?? null
  while (sib && sib.tagName === 'TR') {
    fileRows.push(sib)
    sib = sib.nextElementSibling
  }
  const linkedFiles: PurchaseOrderLinkedFile[] = fileRows
    .map((row) => {
      const rowText = text(row)
      if (!rowText || rowText.toLowerCase() === 'none') return null
      const link = row.querySelector('a')
      if (link) return { name: text(link), url: link.getAttribute('href') ?? '' }
      return { name: rowText, url: '' }
    })
    .filter((f): f is PurchaseOrderLinkedFile => !!f)

  const builddocForm = doc.querySelector('#builddoc_form')
  const token = builddocForm?.querySelector('input[name="token"]')?.getAttribute('value') ?? ''
  const modelSelect = builddocForm?.querySelector('select[name="model"]')
  const modelOptions: PurchaseOrderDocOption[] = Array.from(modelSelect?.querySelectorAll('option') ?? []).map((o) => ({
    value: o.getAttribute('value') ?? '',
    label: text(o),
  }))
  const langSelect = builddocForm?.querySelector('select#lang_id')
  const langOptions: PurchaseOrderDocOption[] = Array.from(langSelect?.querySelectorAll('option') ?? []).map((o) => ({
    value: o.getAttribute('value') ?? '',
    label: text(o),
  }))
  const defaultLang = langSelect?.querySelector('option[selected]')?.getAttribute('value') ?? langOptions[0]?.value ?? 'en_US'

  return { docGen: { token, modelOptions, langOptions, defaultLang }, linkedFiles }
}

// Every condition here is copied straight from card.php's own action-buttons
// block (fk_statut/billed only — the usercan* permission flags all end up
// true for this deployment's own admin user, the only one this app has been
// tested against, so they're not modeled separately here).
function computeActions(statusCode: number | null, billed: boolean): PurchaseOrderAvailableActions {
  const s = statusCode
  return {
    canSendMail: s !== null && [2, 3, 4, 5].includes(s),
    canReopen: s !== null && [3, 4, 5, 6, 7, 9].includes(s),
    canCreateReception: s !== null && [3, 4, 5].includes(s),
    canClassifyReception: s === 3 || s === 4,
    canCreateBill: s !== null && s >= 2 && s !== 7 && !billed,
    canClassifyBilled: s !== null && s >= 2 && s !== 7 && !billed,
    canClone: true,
    canDelete: s === 0,
  }
}

export function parsePurchaseOrderCard(html: string, id: number): PurchaseOrderCard {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const ref = text(doc.querySelector('.refidno-sub h3'))

  // Third-party: `... : ' . $object->thirdparty->getNomUrl(1)` — the same
  // real Societe::getNomUrl() already relied on elsewhere in this app
  // (fourn/card.php?socid=N href, avatar-div text excluded from the name).
  const thirdPartyAnchor = doc.querySelector('.refidno-sub a[href*="fourn/card.php?socid="]')
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

  // Status: LibStatut() renders one of a small, known set of English badge
  // labels (see purchaseOrderListParser.ts's STATUS_LABELS, read directly
  // from langs/en_US/orders.lang) — matched by scanning every ".badge"
  // element for the first whose text resolves to a known status, rather
  // than depending on dol_banner_tab's own exact wrapper markup (a generic,
  // shared Dolibarr function not specific to this page).
  let statusLabel = ''
  let statusCode: number | null = null
  for (const badge of Array.from(doc.querySelectorAll('.badge'))) {
    const t = text(badge)
    const code = parseStatusCode(t)
    if (code !== null) {
      statusLabel = t
      statusCode = code
      break
    }
  }
  const billed = /billed/i.test(statusLabel)

  const lines = parseDatabaseLines(html)
  const { docGen, linkedFiles } = parseDocGenAndFiles(doc)

  return {
    id,
    ref,
    refSupplier: text(findRowValue(doc, 'Ref. vendor')),
    thirdPartyName,
    socid,
    projectRef: text(projectAnchor),
    projectId: projectIdMatch ? Number(projectIdMatch[1]) : null,
    statusLabel,
    statusCode,
    billed,
    date: text(findRowValue(doc, 'Date')),
    method: text(findRowValue(doc, 'Method')),
    requestAuthor: text(findRowValue(doc, 'Request author')),
    discountsText: text(findRowValue(doc, 'Discounts')),
    paymentTermsLabel: text(findRowValue(doc, 'Payment Terms')),
    paymentTypeLabel: text(findRowValue(doc, 'Payment Type')),
    currencyLabel: text(findRowValue(doc, 'Currency')),
    deliveryDate: text(findRowValue(doc, 'Planned date of delivery')),
    noDaysToDelivery: text(findRowValue(doc, 'No. of Days To Delivery')),
    incotermLabel: text(findRowValue(doc, 'Incoterms')),
    amountHt: parseAmount(text(findRowValue(doc, 'Amount (excl. tax)'))),
    amountVat: parseAmount(text(findRowValue(doc, 'VAT'))),
    amountTtc: parseAmount(text(findRowValue(doc, 'Amount (inc. tax)'))),
    lines,
    docGen,
    linkedFiles,
    actions: computeActions(statusCode, billed),
  }
}
