import { useQuery } from '@tanstack/react-query'
import { getMassTransferImportSpec, type MassTransferImportSpec } from '../../api/products'

// The stock-transfer file of the Mass stock transfer page. product/stock/fapi/mass_transfer_import.php describes it (separator, header row, the columns
// Source warehouse id / Target warehouse id / Product / Quantity / Lot-batch and the product syntax); the file is read here and turned into the rows of
// the page, which records them one transfer at a time as before.

export function useMassTransferImportSpec() {
  return useQuery({ queryKey: ['warehouses', 'massTransferImportSpec'], queryFn: getMassTransferImportSpec, staleTime: 1000 * 60 * 30, retry: false })
}

// Splits delimited text into rows; a cell may be wrapped in double quotes (doubled quotes inside) and then may contain the separator or a line break.
export function parseDelimited(text: string, separator: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const input = text.replace(/^﻿/, '')
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === separator) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

export interface ImportProduct {
  id: string
  ref: string
}

// A product cell is a bare ref, "ref:REF", "id:N" or a numeric product id (a bare cell is tried as a ref first).
export function resolveProductCell(cell: string, products: ImportProduct[]): ImportProduct | null {
  const value = cell.trim()
  if (!value) return null
  const lower = value.toLowerCase()
  if (lower.startsWith('id:')) return products.find((p) => p.id === value.slice(3).trim()) ?? null
  if (lower.startsWith('ref:')) {
    const ref = value.slice(4).trim().toLowerCase()
    return products.find((p) => p.ref.toLowerCase() === ref) ?? null
  }
  return products.find((p) => p.ref.toLowerCase() === lower) ?? (/^\d+$/.test(value) ? (products.find((p) => p.id === value) ?? null) : null)
}

export interface ImportedTransferRow {
  sourceWarehouseId: string
  targetWarehouseId: string
  productId: string
  lotSerial: string
  qty: string
  // why this line cannot be recorded as it is (unknown product or warehouse, bad quantity); empty when it is fine
  problem: string
}

export function readTransferFile(text: string, spec: Pick<MassTransferImportSpec, 'separator' | 'has_header'>, products: ImportProduct[], warehouseIds: string[]): ImportedTransferRow[] {
  const lines = parseDelimited(text, spec.separator || ',')
  const data = spec.has_header ? lines.slice(1) : lines
  return data.map((cells, i) => {
    const [from = '', to = '', product = '', qty = '', lot = ''] = cells.map((c) => c.trim())
    const found = resolveProductCell(product, products)
    const problems: string[] = []
    if (!warehouseIds.includes(from)) problems.push(`source warehouse "${from}" not found`)
    if (!warehouseIds.includes(to)) problems.push(`target warehouse "${to}" not found`)
    if (!found) problems.push(`product "${product}" not found`)
    if (!(Number(qty) > 0)) problems.push('quantity must be above 0')
    return {
      sourceWarehouseId: warehouseIds.includes(from) ? from : '',
      targetWarehouseId: warehouseIds.includes(to) ? to : '',
      productId: found?.id ?? '',
      lotSerial: lot,
      qty,
      problem: problems.length ? `Line ${i + (spec.has_header ? 2 : 1)} of the file: ${problems.join('; ')}.` : '',
    }
  })
}
