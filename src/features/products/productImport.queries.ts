import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyJsonBody, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// The classic Product Import Wizard (product/product_import_wizard.php) runs on
// one JSON AJAX file, product/ajax/product_import_wizard.php (session cookie,
// needs produit->creer). Actions, read from its source:
//   init                    warehouses, ZRA qty / packing units, VAT source codes
//   parse_file              multipart import_file (.csv / .xlsx / .xls) -> staged rows
//   commit                  payload {rows, warehouse_id, zra_sync} (+ saved_file) -> created / updated
//   list_imports            files archived after earlier successful imports
//   get_product_count       how many products exist
//   download_sample         CSV template (a file, not JSON)
//   export_current_products every product as a CSV in the import layout (a file)
// commit runs in one database transaction: one bad row rolls the whole import back.
const AJAX = '/product/ajax/product_import_wizard.php'

// One staged row, keyed by the AJAX file's own field names (normalize_by_map).
export const IMPORT_FIELDS = [
  'ref', 'label', 'price_ttc', 'vat', 'barcode', 'zra_class', 'nature', 'opening_stock', 'category', 'zra_qty_unit', 'origin_country',
  'cost_price', 'min_selling_ttc', 'min_selling_ht', 'enable_lots', 'lot_no', 'sell_by', 'eat_by', 'description', 'zra_pkg_unit', 'type',
  'for_sale', 'for_purchase', 'ipl_cat', 'ipl_rate', 'tl_cat', 'tl_rate', 'excise_cat', 'excise_rate', 'stock_alert', 'desired_stock',
  'manufacturer_tpin', 'manufacturer_item_code', 'vat_code', 'price_base_type', 'uom_lines',
] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]
export type ImportRow = Record<ImportField, string>

// The fields commit refuses a row without (its own $mandatory list).
export const MANDATORY_FIELDS: { key: ImportField; label: string }[] = [
  { key: 'ref', label: 'Ref' },
  { key: 'label', label: 'Label' },
  { key: 'zra_class', label: 'ZRA Class Code' },
  { key: 'zra_qty_unit', label: 'ZRA Qty Unit Code' },
  { key: 'zra_pkg_unit', label: 'ZRA Pkg Unit Code' },
  { key: 'opening_stock', label: 'Opening Stock' },
  { key: 'vat_code', label: 'VAT Src Code' },
  { key: 'price_base_type', label: 'Price Base Type' },
]

export interface ImportInitData {
  warehouses: { id: number; label: string }[]
  qty_units: { id: number; code: string; label: string }[]
  pkg_units: { id: number; code: string; label: string }[]
  vat_codes: { code: string; taux: string | number }[]
}

export interface ImportCommitResult {
  created: { row: number; product_id: number; ref: string }[]
  updated: { row: number; product_id: number; ref: string }[]
  count_created: number
  count_updated: number
}

// Thrown when commit refuses the import; `details` lists every row problem.
export class ImportRefusedError extends Error {
  details: string[]
  constructor(message: string, details: string[]) {
    super(message)
    this.name = 'ImportRefusedError'
    this.details = details
  }
}

async function postAction<T>(body: FormData): Promise<T & { success: boolean; error?: string; details?: string[] }> {
  const res = await fetch(AJAX, { method: 'POST', credentials: 'same-origin', body })
  const text = await res.text()
  const json = legacyJsonBody<T & { success: boolean; error?: string; details?: string[] }>(text, 'The import wizard')
  if (!json.success) throw new ImportRefusedError(json.error || 'The import wizard refused this request.', json.details ?? [])
  return json
}

function form(action: string, fields: Record<string, string | Blob> = {}) {
  const fd = new FormData()
  fd.set('action', action)
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

/** A blank row with the defaults the AJAX file fills in. */
export function emptyImportRow(): ImportRow {
  const row = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, ''])) as ImportRow
  return { ...row, origin_country: 'ZM', enable_lots: '0', type: '0', for_sale: '1', for_purchase: '1', ipl_rate: '0', tl_rate: '0', excise_rate: '0', price_base_type: 'TTC' }
}

/** Missing mandatory fields per row (1-based row numbers, as the wizard shows them). */
export function missingMandatory(rows: ImportRow[]): { row: number; fields: string[] }[] {
  return rows
    .map((r, i) => ({ row: i + 1, fields: MANDATORY_FIELDS.filter((f) => !String(r[f.key] ?? '').trim()).map((f) => f.label) }))
    .filter((r) => r.fields.length > 0)
}

export function useImportInit() {
  return useQuery({
    queryKey: ['products', 'import', 'init'],
    queryFn: () => postAction<ImportInitData>(form('init')),
    staleTime: 1000 * 60 * 5,
  })
}

export function useImportHistory() {
  return useQuery({
    queryKey: ['products', 'import', 'history'],
    queryFn: async () => (await postAction<{ files: { date: string; code: string; name: string }[] }>(form('list_imports'))).files ?? [],
  })
}

export function useProductCount() {
  return useQuery({
    queryKey: ['products', 'import', 'count'],
    queryFn: async () => (await postAction<{ count: number }>(form('get_product_count'))).count ?? 0,
  })
}

export function useParseImportFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const json = await postAction<{ rows: Partial<ImportRow>[]; saved_file?: string; saved_filename?: string }>(form('parse_file', { import_file: file }))
      const blank = emptyImportRow()
      const rows = (json.rows ?? []).map((r) => {
        const row = { ...blank }
        for (const f of IMPORT_FIELDS) if (r[f] !== undefined && r[f] !== null) row[f] = String(r[f])
        return row
      })
      return { rows, savedFile: json.saved_file ?? '', savedFileName: json.saved_filename ?? file.name }
    },
  })
}

export function useCommitImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { rows: ImportRow[]; warehouseId: string; zraSync: boolean; savedFile: string; savedFileName: string }) => {
      const payload = JSON.stringify({ rows: input.rows, warehouse_id: input.warehouseId ? Number(input.warehouseId) : 0, zra_sync: input.zraSync ? 1 : 0 })
      const fields: Record<string, string> = { payload }
      if (input.savedFile) {
        fields.saved_file = input.savedFile
        fields.saved_filename = input.savedFileName
      }
      const json = await postAction<ImportCommitResult>(form('commit', fields))
      return { created: json.created ?? [], updated: json.updated ?? [], count_created: json.count_created ?? 0, count_updated: json.count_updated ?? 0 }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/** download_sample / export_current_products answer a CSV file; fetched and saved as a download. */
export async function downloadImportFile(action: 'download_sample' | 'export_current_products', fallbackName: string) {
  const res = await fetch(`${AJAX}?action=${action}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`The import wizard returned ${res.status}.`)
  const blob = await res.blob()
  if (blob.type.includes('text/html') && looksLikeLegacyLoginPageText(await blob.text())) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Column headers parse_file maps back to each field (its map_headers aliases),
// so an exported staged file can be uploaded again.
const CSV_HEADERS: Record<ImportField, string> = {
  ref: 'Ref', label: 'Label', price_ttc: 'Price TTC', vat: 'VAT %', barcode: 'Barcode', zra_class: 'ZRA Class Code', nature: 'Nature',
  opening_stock: 'Opening Stock', category: 'Category', zra_qty_unit: 'ZRA Qty Unit Code', origin_country: 'Origin Country', cost_price: 'Cost Price',
  min_selling_ttc: 'Min Selling TTC', min_selling_ht: 'Min Price HT', enable_lots: 'Enable Lots', lot_no: 'Lot/Batch No.', sell_by: 'Sell By Date',
  eat_by: 'Eat By / Expiry Date', description: 'Description', zra_pkg_unit: 'ZRA Pkg Unit Code', type: 'Type', for_sale: 'For Sale',
  for_purchase: 'For Purchase', ipl_cat: 'IPL Category Code', ipl_rate: 'IPL Rate %', tl_cat: 'TL Category Code', tl_rate: 'TL Rate %',
  excise_cat: 'Excise Category Code', excise_rate: 'Excise Rate %', stock_alert: 'Stock Alert Threshold', desired_stock: 'Desired Stock Level',
  manufacturer_tpin: 'Manufacturer TPIN', manufacturer_item_code: 'Manufacturer Item Code', vat_code: 'VAT Src Code', price_base_type: 'Price Type',
  uom_lines: 'UOM Lines',
}

/** The staged rows as a CSV in the import layout, for "Export Staged". */
export function stagedRowsToCsv(rows: ImportRow[]): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return [IMPORT_FIELDS.map((f) => CSV_HEADERS[f]).join(','), ...rows.map((r) => IMPORT_FIELDS.map((f) => cell(r[f] ?? '')).join(','))].join('\n')
}
