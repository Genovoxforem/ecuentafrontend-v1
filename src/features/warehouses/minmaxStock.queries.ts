import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real reference page: product/stock/uom/minmax_stock.php ("Min/Max Stock
// Level Management"). Confirmed via source (class/minmax_stock.class.php)
// that this is genuinely classic Dolibarr — no json_encode anywhere in the
// dispatch file, no companion JS/AJAX app (unlike movement_list.php's real
// SPA). Every KPI tile, the Stock Status breakdown, and every table row come
// from one real page fetch — no per-record follow-up needed. Live-verified:
// "Showing 107 products", "With Min Level: 3" KPI, "?filter_status=has_min"
// returning exactly those 3 rows, and "?search=001" returning 16 matches.
//
// Real write actions (confirmed live against a disposable product, then
// reverted): action=bulkupdate (the page's only real persist path — the
// entire visible table is one <form id="bulkForm">, and Save All Changes
// submits it; there is no per-row save button, so this hook posts only the
// rows the user actually edited, which is equivalent — updateStockLevels()
// is a plain idempotent UPDATE per product) and action=applysuggested.
// Failures surface as an inline showToast(msg, "error") call (confirmed
// live: submitting min_stock > max_stock on product_id=1 returned
// showToast("Error: Minimum stock cannot be greater than maximum stock",
// "error")) — the same pattern used throughout this app's classic-HTML
// write paths.
//
// Selling Price is real but genuinely read-only from this page: the source
// shows an editable price_<id> input, but action=bulkupdate never reads it
// (GETPOST'd then discarded — confirmed by reading the handler), and
// action=update (the only handler that would take min/max+price together)
// is never actually submitted by anything in the rendered page (no per-row
// form exists for it). updateSellingPrice() is only ever called from the
// CSV import path. Rendering it as an editable control here would be a
// non-functional control the reference app also doesn't really offer
// through its own UI, so it's shown as plain formatted text instead.

export type MinMaxStatusKey = 'ok' | 'out_of_stock' | 'below_min' | 'above_max'

export interface MinMaxStockRow {
  id: number
  ref: string
  label: string
  barcode: string | null
  status: MinMaxStatusKey
  statusLabel: string
  currentStock: number
  minStock: number
  maxStock: number
  suggestedMin: number
  suggestedMax: number
  avgDailyUsage: number
  leadTimeDays: number
  sellingPrice: number
  stockValue: number
}

export interface MinMaxStockStats {
  totalProducts: number
  withMin: number
  withMax: number
  coveragePct: number
  withNone: number
  statusCounts: Record<MinMaxStatusKey, number>
}

export interface MinMaxStockPageData {
  stats: MinMaxStockStats
  rows: MinMaxStockRow[]
}

export interface MinMaxStockFilters {
  search?: string
  filterStatus?: 'no_min' | 'has_min' | ''
}

const STATUS_BY_BADGE: Record<string, { key: MinMaxStatusKey; label: string }> = {
  success: { key: 'ok', label: 'OK' },
  danger: { key: 'out_of_stock', label: 'OUT' },
  warning: { key: 'below_min', label: 'LOW' },
  purple: { key: 'above_max', label: 'HIGH' },
}

function textOf(cell: string): string {
  return cell.replace(/<[^>]*>/g, '').trim()
}

function numOf(text: string): number {
  const n = Number(text.replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function parseProductRow(rowHtml: string): MinMaxStockRow | null {
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g
  const cells: string[] = []
  let c: RegExpExecArray | null
  while ((c = cellRe.exec(rowHtml))) cells.push(c[1])
  if (cells.length < 11) return null

  const idMatch = cells[0].match(/product_ids\[\]" value="(\d+)"/)
  const refMatch = cells[0].match(/class="fw-semibold">([^<]*)<\/a>/)
  if (!idMatch || !refMatch) return null
  const labelMatch = cells[0].match(/<span class="small text-muted">([^<]*)<\/span>/)
  const barcodeMatch = cells[0].match(/fa-barcode"><\/i> ([^<]*)<\/span>/)

  const badgeMatch = cells[1].match(/badge bg-(\w+)">([^<]*)<\/span>/)
  const statusInfo = (badgeMatch && STATUS_BY_BADGE[badgeMatch[1]]) || { key: 'ok' as MinMaxStatusKey, label: badgeMatch?.[2] ?? '?' }

  const minMatch = cells[3].match(/value="([^"]*)"/)
  const maxMatch = cells[4].match(/value="([^"]*)"/)
  const suggMinMatch = cells[5].match(/^(\d+)/)
  const suggMaxMatch = cells[6].match(/^(\d+)/)
  const dailyMatch = cells[7].match(/([\d.]+)\/d/)
  const leadMatch = cells[8].match(/(\d+)d/)
  const priceMatch = cells[9].match(/value="([^"]*)"/)

  return {
    id: Number(idMatch[1]),
    ref: refMatch[1].trim(),
    label: labelMatch ? labelMatch[1].trim() : '',
    barcode: barcodeMatch ? barcodeMatch[1].trim() : null,
    status: statusInfo.key,
    statusLabel: statusInfo.label,
    currentStock: numOf(textOf(cells[2])),
    minStock: minMatch && minMatch[1] ? numOf(minMatch[1]) : 0,
    maxStock: maxMatch && maxMatch[1] ? numOf(maxMatch[1]) : 0,
    suggestedMin: suggMinMatch ? numOf(suggMinMatch[1]) : 0,
    suggestedMax: suggMaxMatch ? numOf(suggMaxMatch[1]) : 0,
    avgDailyUsage: dailyMatch ? numOf(dailyMatch[1]) : 0,
    leadTimeDays: leadMatch ? numOf(leadMatch[1]) : 7,
    sellingPrice: priceMatch && priceMatch[1] ? numOf(priceMatch[1]) : 0,
    stockValue: numOf(textOf(cells[10])),
  }
}

function parseRows(html: string): MinMaxStockRow[] {
  const tableStart = html.indexOf('table-sm table-hover')
  if (tableStart === -1) return []
  const tbodyStart = html.indexOf('<tbody>', tableStart)
  const tbodyEnd = html.indexOf('</tbody>', tbodyStart)
  if (tbodyStart === -1 || tbodyEnd === -1) return []
  const tbodyHtml = html.slice(tbodyStart, tbodyEnd)

  const rows: MinMaxStockRow[] = []
  const rowRe = /<tr[\s\S]*?<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(tbodyHtml))) {
    const row = parseProductRow(m[0])
    if (row) rows.push(row)
  }
  return rows
}

function parseStats(html: string): MinMaxStockStats {
  const kpi: Record<string, string> = {}
  const kpiRe = /ec-report-stats-title">([^<]*)<\/div><div class="ec-report-stats-value">([^<]*)<\/div>/g
  let k: RegExpExecArray | null
  while ((k = kpiRe.exec(html))) kpi[k[1]] = k[2]

  const statusCounts: Record<MinMaxStatusKey, number> = { ok: 0, out_of_stock: 0, below_min: 0, above_max: 0 }
  const statusLabelToKey: Record<string, MinMaxStatusKey> = { OK: 'ok', 'Out of Stock': 'out_of_stock', 'Below Min': 'below_min', 'Above Max': 'above_max' }
  const statusRe = /<span>(OK|Out of Stock|Below Min|Above Max): <b>(\d+)<\/b><\/span>/g
  let s: RegExpExecArray | null
  while ((s = statusRe.exec(html))) statusCounts[statusLabelToKey[s[1]]] = Number(s[2])

  return {
    totalProducts: numOf(kpi['Total Products'] ?? '0'),
    withMin: numOf(kpi['With Min Level'] ?? '0'),
    withMax: numOf(kpi['With Max Level'] ?? '0'),
    coveragePct: parseFloat(kpi['Coverage'] ?? '0'),
    withNone: numOf(kpi['No Levels Set'] ?? '0'),
    statusCounts,
  }
}

function extractToastError(html: string): string | null {
  const m = html.match(/showToast\("((?:[^"\\]|\\.)*)",\s*"error"\)/)
  if (!m) return null
  const div = document.createElement('div')
  div.innerHTML = m[1].replace(/\\'/g, "'")
  return (div.textContent ?? 'The legacy backend rejected this action.').trim()
}

function scrapeToken(html: string): string {
  const m = html.match(/name="token" value="([a-f0-9]+)"/)
  if (!m) throw new Error('Could not find a CSRF token on the legacy page.')
  return m[1]
}

const BASE = '/product/stock/uom/minmax_stock.php'

function buildQuery(filters: MinMaxStockFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.filterStatus) params.set('filter_status', filters.filterStatus)
  const qs = params.toString()
  return qs ? `${BASE}?${qs}` : BASE
}

export function useMinMaxStockPage(filters: MinMaxStockFilters) {
  return useQuery({
    queryKey: ['warehouses', 'minMaxStock', filters],
    queryFn: async (): Promise<MinMaxStockPageData> => {
      const res = await fetch(buildQuery(filters), { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      return { stats: parseStats(html), rows: parseRows(html) }
    },
    staleTime: 1000 * 30,
  })
}

async function fetchFreshToken(): Promise<string> {
  const res = await fetch(BASE, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return scrapeToken(await res.text())
}

export interface BulkStockUpdateEntry {
  productId: number
  minStock: number
  maxStock: number
}

// Real contract: POST action=bulkupdate + one product_ids[] per product +
// min_<id>/max_<id> per product (the same fields the real "Save All Changes"
// form submits, restricted here to just the edited rows).
export function useBulkUpdateMinMaxStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entries: BulkStockUpdateEntry[]) => {
      if (entries.length === 0) return
      const token = await fetchFreshToken()
      const body = new URLSearchParams({ token, action: 'bulkupdate' })
      for (const e of entries) {
        body.append('product_ids[]', String(e.productId))
        body.set(`min_${e.productId}`, String(e.minStock))
        body.set(`max_${e.productId}`, String(e.maxStock))
      }
      const res = await fetch(BASE, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const toastError = extractToastError(html)
      if (toastError) throw new Error(toastError)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'minMaxStock'] }),
  })
}

// Real contract: POST action=applysuggested — applies suggested min/max to
// every product currently without a min level set (server-side, matches
// applyAllSuggestedLevels()).
export function useApplySuggestedLevels() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const token = await fetchFreshToken()
      const body = new URLSearchParams({ token, action: 'applysuggested' })
      const res = await fetch(BASE, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const toastError = extractToastError(html)
      if (toastError) throw new Error(toastError)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'minMaxStock'] }),
  })
}

// Real contract: POST action=importcsv, multipart, field name "csvfile".
// Required column: product_ref; min_stock/max_stock/selling_price optional
// (blank keeps the existing value) — matches the real handler exactly.
export function useImportMinMaxCsv() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const token = await fetchFreshToken()
      const form = new FormData()
      form.set('token', token)
      form.set('action', 'importcsv')
      form.set('csvfile', file)
      const res = await fetch(BASE, { method: 'POST', credentials: 'same-origin', body: form })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const toastError = extractToastError(html)
      if (toastError) throw new Error(toastError)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'minMaxStock'] }),
  })
}
