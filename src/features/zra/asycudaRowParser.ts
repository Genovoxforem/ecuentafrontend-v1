import type { AsycudaImportRow, AsycudaUpdateItem } from './asycudaImport.queries'

// The real custom/zra/zra-import_ajax.php builds every cell as <br>-joined
// HTML text (read directly, not guessed — see that file's $data[] build).
// These three helpers turn that back into plain values so rows can render
// as native React instead of dangerouslySetInnerHTML. Originally lived only
// in SplitDetailsModal.tsx; moved here so the main list can reuse the exact
// same parsing instead of duplicating it.
export function extractLines(html: string): string[] {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n')
  const div = document.createElement('div')
  div.innerHTML = withBreaks
  return (div.textContent || '').split('\n').map((s) => s.trim()).filter(Boolean)
}
export function afterColon(line: string | undefined): string {
  if (!line) return 'N/A'
  const idx = line.indexOf(':')
  return (idx === -1 ? line : line.slice(idx + 1)).trim() || 'N/A'
}
export function splitPipe(line: string | undefined): [string, string] {
  const [a, b] = (line ?? '').split('|')
  return [afterColon(a), afterColon(b)]
}

export interface ParsedAsycudaFields {
  declRef: string
  declNo: string
  taskCode: string
  declDate: string
  supplierName: string
  agentName: string
  itemName: string
  hsn: string
  origin: string
  totalWeight: string
  netWeight: string
  price: string
  currency: string
  convRate: string
  qtyOverPkg: string
  qtyUnit: string
  pkgUnit: string
}

export function parseRowFields(row: AsycudaImportRow): ParsedAsycudaFields {
  const decl = extractLines(row.declHtml)
  const supplier = extractLines(row.supplierHtml)
  const item = extractLines(row.itemHtml)
  const invoice = extractLines(row.invoiceHtml)
  const quantity = extractLines(row.quantityHtml)
  const [hsn, origin] = splitPipe(item[1])
  const [totalWeight, netWeight] = splitPipe(item[2])
  const [currency, convRate] = splitPipe(invoice[1])
  const [qtyUnit, pkgUnit] = splitPipe(quantity[1])

  return {
    declRef: afterColon(decl[0]),
    declNo: afterColon(decl[1]),
    taskCode: afterColon(decl[2]),
    declDate: afterColon(decl[3]),
    supplierName: supplier[0] ?? 'N/A',
    agentName: afterColon(supplier[1]),
    itemName: item[0] ?? 'N/A',
    hsn,
    origin,
    totalWeight,
    netWeight,
    price: afterColon(invoice[0]),
    currency,
    convRate,
    qtyOverPkg: quantity[0] ?? 'N/A',
    qtyUnit,
    pkgUnit,
  }
}

export interface SimilarProduct {
  label: string
  proid: string
}

export type AsycudaActionState =
  | { kind: 'exact-match'; updateItem: AsycudaUpdateItem }
  | { kind: 'similar-matches'; updateItem: AsycudaUpdateItem; similarProducts: SimilarProduct[] }
  | { kind: 'needs-create'; updateItem: AsycudaUpdateItem }

// actionsHtml carries one of three fixed shapes depending on real backend
// product-matching (hasExactMatch / hasSimilarMatches / else) — detected via
// zra-import_ajax.php's own literal button/badge text so this stays in sync
// with that file without needing a JSON contract of its own. Every button in
// a row (Approve/Cancel/each suggestion's Approve) carries the same real
// data-* attributes the legacy onclick bridge used to read — parsed here via
// DOMParser instead of a window.fn* global bridge.
export function parseActionsState(actionsHtml: string): AsycudaActionState {
  const doc = new DOMParser().parseFromString(actionsHtml, 'text/html')
  const cancelBtn = doc.querySelector('.cancel-btn')
  const baseItem: AsycudaUpdateItem = {
    itemNm: cancelBtn?.getAttribute('data-itemnm') ?? '',
    itemSeq: cancelBtn?.getAttribute('data-itemseq') ?? '',
    hsCd: cancelBtn?.getAttribute('data-hscd') ?? '',
    taskCd: cancelBtn?.getAttribute('data-taskcd') ?? '',
    dclDe: cancelBtn?.getAttribute('data-dclde') ?? '',
    dclRefNum: cancelBtn?.getAttribute('data-dclrefnum') ?? '',
  }

  if (actionsHtml.includes('Product Already Exists')) {
    const approveBtn = doc.querySelector('.approve-btn')
    return { kind: 'exact-match', updateItem: { ...baseItem, proid: approveBtn?.getAttribute('data-proid') ?? undefined } }
  }

  if (actionsHtml.includes('View Suggestions')) {
    const similarProducts: SimilarProduct[] = Array.from(doc.querySelectorAll('.modal-body li')).map((li) => {
      const btn = li.querySelector('.approve-btn')
      const labelNode = Array.from(li.childNodes).find((n) => n.nodeType === Node.TEXT_NODE)
      return { label: labelNode?.textContent?.trim() || 'N/A', proid: btn?.getAttribute('data-proid') ?? '' }
    })
    return { kind: 'similar-matches', updateItem: baseItem, similarProducts }
  }

  const approveBtn = doc.querySelector('.approve-btn')
  return { kind: 'needs-create', updateItem: { ...baseItem, proid: approveBtn?.getAttribute('data-proid') ?? undefined } }
}
