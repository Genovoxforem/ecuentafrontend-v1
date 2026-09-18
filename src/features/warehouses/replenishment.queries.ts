import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseStatusCode } from '../purchaseOrders/purchaseOrderListParser'

// Real reference pages: product/stock/replenish.php ("Missing Stocks") and
// product/stock/replenishorders.php ("Replenishment Orders") — the two tabs
// of the "Replenishment" screen. Both are genuinely classic Dolibarr (no
// json_encode anywhere in either file, confirmed by grep) — read directly
// from source, not guessed:
//
// - replenish.php lists every product where stock < max(desiredstock,
//   seuil_stock_alerte) (real fields on llx_product), computes "To Order" =
//   max(desiredstock, alertstock) - stock [- ordered when using physical
//   stock], and renders one real <select name="fournN"> per row from
//   Form::select_product_fourn_price() — the SAME real vendor-price options
//   a Purchase Order line would use, keyed by product_fournisseur_price.id.
// - "Create orders" is a real write: POST action=order&valid=<truthy> with
//   one choose{i}=on / fourn{i}=<price id> / tobuy{i}=<qty> triplet per
//   selected row (i renumbered 0..k-1 across just the rows being submitted —
//   confirmed from source: the handler only processes indices where
//   choose{i}==='on' && fourn{i}>0, so omitting the rest is harmless) plus
//   linecount=<k>. It groups selected lines by vendor and creates (or
//   reuses an existing draft) one purchase order per vendor, then redirects
//   to replenishorders.php on success.
// - replenishorders.php lists open purchase orders that contain at least
//   one predefined product (real dolDispatchToDo()/getProducts() checks,
//   not a generic order list) — reused here rather than the app's existing
//   Purchase Orders JSON endpoint because that endpoint's DataTables
//   response never exposes total_ttc (only total_ht), while this page's own
//   SQL selects cf.total_ttc directly, matching the reference's "Amount
//   (Inc. Tax)" column exactly.

export interface ReplenishmentVendorOption {
  value: number // product_fournisseur_price.id — 0 means "no vendor selected / not available"
  label: string
  selected: boolean
}

export interface MissingStockRow {
  productId: number
  ref: string
  label: string
  desiredStock: number
  limitForAlert: number
  stock: number
  belowAlert: boolean
  ordered: number
  toOrderDefault: number
  vendorOptions: ReplenishmentVendorOption[]
  hasVendorPrice: boolean
}

export interface MissingStocksFilters {
  mode: 'virtual' | 'physical'
  fkSupplier?: number
}

function textOf(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function numOf(text: string): number {
  const m = text.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : 0
}

function parseVendorOptions(selectHtml: string): ReplenishmentVendorOption[] {
  const options: ReplenishmentVendorOption[] = []
  const optRe = /<option value="(\d+)"([^>]*)>([^<]*)<\/option>/g
  let m: RegExpExecArray | null
  while ((m = optRe.exec(selectHtml))) {
    const label = m[3].replace(/&nbsp;/g, ' ').trim()
    if (!label) continue // skip the blank placeholder <option value="0">&nbsp;</option>
    options.push({ value: Number(m[1]), label, selected: /\bselected\b/.test(m[2]) })
  }
  return options
}

// Cell positions are located by content marker rather than a fixed index:
// an optional "current stock (selected warehouse only)" column is inserted
// right after the global current-stock cell when
// STOCK_ALLOW_ADD_LIMIT_STOCK_BY_WAREHOUSE is enabled (confirmed in
// replenish.php's source) — a config this scraper can't see from the HTML
// alone, so the "Ordered" cell (always the first one linking to
// replenishorders.php) is used as the anchor to find every cell after it,
// keeping this correct whether or not that extra column is present.
function parseMissingStockRow(rowHtml: string): MissingStockRow | null {
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g
  const cells: string[] = []
  let c: RegExpExecArray | null
  while ((c = cellRe.exec(rowHtml))) cells.push(c[1])
  if (cells.length < 7) return null
  if (!cells[0].includes('type="checkbox"')) return null

  // cells[1] = product ref link — this theme renders it as
  // <div>{label}<span class="small text-muted">Ref: {ref}</span></div>
  // (label first, ref as a muted subtitle), confirmed live — not plain ref
  // text. cells[2] independently repeats the plain label.
  const idMatch = cells[1].match(/[?&]id=(\d+)/)
  if (!idMatch) return null
  const refMatch = cells[1].match(/small text-muted">Ref:\s*([^<]*)<\/span>/)
  const ref = refMatch ? refMatch[1].trim() : textOf(cells[1])
  const label = textOf(cells[2].replace(/<input[^>]*>/g, ''))

  const desiredStock = numOf(textOf(cells[3]))
  const limitForAlert = numOf(textOf(cells[4]))
  const stock = numOf(textOf(cells[5]))

  const orderedIdx = cells.findIndex((cell, i) => i >= 5 && cell.includes('replenishorders.php'))
  if (orderedIdx === -1) return null
  const orderedMatch = cells[orderedIdx].match(/>([\d.,]+)<\/a>/)
  const ordered = orderedMatch ? numOf(orderedMatch[1]) : numOf(textOf(cells[orderedIdx]))

  const toOrderMatch = cells[orderedIdx + 1]?.match(/value="([^"]*)"/)
  const toOrderDefault = toOrderMatch ? numOf(toOrderMatch[1]) : 0

  const vendorOptions = cells[orderedIdx + 2] ? parseVendorOptions(cells[orderedIdx + 2]) : []

  return {
    productId: Number(idMatch[1]),
    ref,
    label,
    desiredStock,
    limitForAlert,
    stock,
    belowAlert: limitForAlert > 0 && stock < limitForAlert,
    ordered,
    toOrderDefault,
    vendorOptions,
    hasVendorPrice: vendorOptions.some((o) => o.value > 0),
  }
}

function parseMissingStocks(html: string): MissingStockRow[] {
  const formStart = html.indexOf('name="formulaire"')
  const section = formStart === -1 ? html : html.slice(formStart)
  const rows: MissingStockRow[] = []
  const rowRe = /<tr class="oddeven">([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(section))) {
    const row = parseMissingStockRow(m[1])
    if (row) rows.push(row)
  }
  return rows
}

function scrapeToken(html: string): string {
  const m = html.match(/name="token" value="([a-f0-9]+)"/)
  if (!m) throw new Error('Could not find a CSRF token on the legacy page.')
  return m[1]
}

function extractToastError(html: string): string | null {
  const m = html.match(/showToast\("((?:[^"\\]|\\.)*)",\s*"error"\)/)
  if (!m) return null
  const div = document.createElement('div')
  div.innerHTML = m[1].replace(/\\'/g, "'")
  return (div.textContent ?? 'The legacy backend rejected this action.').trim()
}

function buildMissingStocksUrl(filters: MissingStocksFilters): string {
  const params = new URLSearchParams({ mode: filters.mode, limit: '500' })
  if (filters.fkSupplier) params.set('fk_supplier', String(filters.fkSupplier))
  return `/product/stock/replenish.php?${params.toString()}`
}

export function useMissingStocks(filters: MissingStocksFilters) {
  return useQuery({
    queryKey: ['warehouses', 'missingStocks', filters],
    queryFn: async (): Promise<{ rows: MissingStockRow[]; token: string }> => {
      const res = await fetch(buildMissingStocksUrl(filters), { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      return { rows: parseMissingStocks(html), token: scrapeToken(html) }
    },
    staleTime: 1000 * 30,
  })
}

export interface ReplenishmentOrderRow {
  id: number
  ref: string
  socid: number | null
  company: string
  author: string
  amountIncTax: number
  orderCreation: string
  statusLabel: string
  statusCode: number | null
}

function parseReplenishmentOrders(html: string): ReplenishmentOrderRow[] {
  const rows: ReplenishmentOrderRow[] = []
  // Data rows are bare <tr> (no class) — header rows are <tr class="liste_titre...">
  // so they never match. Live-verified the Ref link is themed to
  // /commande/purchaseorder/index_v2.php?id=X (not fourn/commande/card.php
  // as the raw Dolibarr source builds it — same custom URL-rewrite pattern
  // seen elsewhere in this app), so real rows are identified by content
  // (the img_object() tooltip text is always literally "Show order") rather
  // than by a specific href path or a positional upper bound — a shared
  // "Cash Position" widget elsewhere on this same page has its own genuine
  // <tbody>, which made an earlier bound-by-first-<tbody> approach here
  // falsely cut off before ever reaching the real table.
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(html))) {
    const rowHtml = m[1]
    if (!rowHtml.includes('"Show order"')) continue
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g
    const cells: string[] = []
    let c: RegExpExecArray | null
    while ((c = cellRe.exec(rowHtml))) cells.push(c[1])
    if (cells.length < 6) continue

    const refMatch = cells[0].match(/href="[^"]*[?&]id=(\d+)/)
    if (!refMatch) continue
    const companyMatch = cells[1].match(/socid=(\d+)/)

    rows.push({
      id: Number(refMatch[1]),
      ref: textOf(cells[0]),
      socid: companyMatch ? Number(companyMatch[1]) : null,
      company: textOf(cells[1]),
      author: textOf(cells[2]),
      amountIncTax: numOf(textOf(cells[3])),
      orderCreation: textOf(cells[4]),
      statusLabel: textOf(cells[5]),
      statusCode: parseStatusCode(textOf(cells[5])),
    })
  }
  return rows
}

export function useReplenishmentOrders(searchProduct?: number) {
  return useQuery({
    queryKey: ['warehouses', 'replenishmentOrders', searchProduct],
    queryFn: async (): Promise<ReplenishmentOrderRow[]> => {
      const params = searchProduct ? `?search_product=${searchProduct}` : ''
      const res = await fetch(`/product/stock/replenishorders.php${params}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseReplenishmentOrders(await res.text())
    },
    staleTime: 1000 * 30,
  })
}

export interface CreateReplenishmentOrderLine {
  productId: number
  vendorPriceId: number
  qty: number
}

// Real contract confirmed from source (product/stock/replenish.php's
// `action == 'order' && GETPOST('valid')` handler): groups selected lines by
// vendor (derived from the chosen product_fournisseur_price row, not from a
// separate company picker), creates one purchase order per vendor (reusing
// an existing draft sourced the same way if one exists), then redirects to
// replenishorders.php. A line with fourn{i}<=0 or tobuy{i}==0 is silently
// skipped server-side (not an error) — the UI should prevent selecting a row
// with no vendor price at all rather than relying on that.
export function useCreateReplenishmentOrders() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ token, lines }: { token: string; lines: CreateReplenishmentOrderLine[] }) => {
      const body = new URLSearchParams({ token, action: 'order', valid: 'Create orders', linecount: String(lines.length) })
      lines.forEach((line, i) => {
        body.set(`choose${i}`, 'on')
        body.set(`fourn${i}`, String(line.vendorPriceId))
        body.set(`tobuy${i}`, String(line.qty))
      })
      const res = await fetch('/product/stock/replenish.php', { method: 'POST', credentials: 'same-origin', body, redirect: 'follow' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const toastError = extractToastError(html)
      if (toastError) throw new Error(toastError)
      // On success the real handler redirects to replenishorders.php, so a
      // non-error response here means the orders were created.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'missingStocks'] })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'replenishmentOrders'] })
    },
  })
}
