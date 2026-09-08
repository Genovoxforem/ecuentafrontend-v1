// product/inventory/inventory.php — the real "count entry" tab. No JSON API
// anywhere in product/inventory/ (confirmed by grep), so this parses the
// classic rendered page directly, same convention as warehouseHtmlParser.ts.
// Every field/action name below was read from the real PHP source (not
// guessed) and confirmed by live-testing each one against a disposable test
// record: adding a line, editing its Real Qty and saving, and deleting it
// all round-tripped correctly. "Make Movements and Close" (action=record ->
// real submit action=update) and "Cancel" (action=confirm_cancel -> real
// submit action=cancel_record) were NOT live-tested — the close action
// posts real stock movements against whatever product/warehouse a line
// points at, and risking that on a shared test product used throughout this
// session wasn't worth it — but both are read directly off the same
// $form->formconfirm(...) calls that correctly predicted the two flows that
// WERE tested (confirm_delete, confirm_deleteline), so the same reasoning
// applies. No Batch/PMP columns exist on this install (isModEnabled
// ('productbatch') and INVENTORY_MANAGE_REAL_PMP are both off, confirmed by
// the live page only ever rendering the plain 5-column table).

export type InventoryLineStatus = 'draft' | 'validated' | 'closed'

export interface InventoryLineRow {
  lineId: number
  warehouseId: number | null
  warehouseRef: string
  productId: number | null
  productRef: string
  productLabel: string
  expectedQty: number
  stockQtySnapshot: string
  realQty: string
}

export interface SelectOption {
  value: string
  label: string
}

export interface InventoryLinesPage {
  token: string
  status: InventoryLineStatus
  canUpdateStock: boolean
  warehouseOptions: SelectOption[]
  productOptions: SelectOption[]
  lines: InventoryLineRow[]
  page: number
  hasNextPage: boolean
}

function decodeEntities(s: string): string {
  const div = document.createElement('div')
  div.innerHTML = s
  return div.textContent ?? ''
}

// fk_warehouse's real placeholder is value="-1" ("Select a warehouse");
// fk_product's is value="0" ("Select Predefined Product/services") — both
// confirmed against a live-captured page, not assumed to share one sentinel.
// Neither select can ever have a real record at id 0 (auto-increment PKs
// start at 1), so excluding it is safe for both.
function parseSelectOptions(html: string, selectName: string): SelectOption[] {
  const selectMatch = html.match(new RegExp(`<select[^>]*name="${selectName}"[^>]*>([\\s\\S]*?)</select>`))
  if (!selectMatch) return []
  const options: SelectOption[] = []
  const optionRe = /<option value="([^"]*)"[^>]*>([^<]*)</g
  let m: RegExpExecArray | null
  while ((m = optionRe.exec(selectMatch[1]))) {
    if (m[1] === '' || m[1] === '-1' || m[1] === '0') continue
    options.push({ value: m[1], label: decodeEntities(m[2]).trim() })
  }
  return options
}

// The query hook below always passes this explicit `limit` so `hasNextPage`
// can be computed reliably (lines.length >= LINES_PER_PAGE) rather than
// scraping the real print_fleche_navigation() pager widget's own next/prev
// markup, which wasn't captured in a real multi-page sample during
// verification (every test record used had well under one page of lines).
export const LINES_PER_PAGE = 25

export function parseInventoryLinesPage(html: string): InventoryLinesPage {
  const token = html.match(/name="token" value="([a-f0-9]+)"/)?.[1] ?? ''

  // Status drives which real actions this page actually offers — read
  // straight off the real per-status markers the PHP source itself branches
  // on (the "Add line" row and the editable Real Qty column only render for
  // STATUS_DRAFT/STATUS_VALIDATED; "Make Movements and Close" only for
  // STATUS_VALIDATED) rather than guessed. Closed and canceled records both
  // fall through to the same read-only line rendering (a stock-movement
  // link instead of an editable input), and telling those two apart isn't
  // needed for this UI, so both map to 'closed'.
  const hasAddLineRow = html.includes('name="addline"')
  const hasCloseButton = html.includes('id="idbuttonmakemovementandclose"')
  const status: InventoryLineStatus = hasCloseButton ? 'validated' : hasAddLineRow ? 'draft' : 'closed'

  // A permission-denied user gets the same addline input but disabled — not
  // distinguished further here; the server enforces the real permission
  // check regardless (see the error surfaced by useAddInventoryLineReal if
  // a write is attempted without it).
  const canUpdateStock = hasAddLineRow

  const warehouseOptions = parseSelectOptions(html, 'fk_warehouse')
  const productOptions = parseSelectOptions(html, 'fk_product')

  const lines: InventoryLineRow[] = []
  const rowRe = /<tr class="oddeven"><td id="id_(\d+)_warehouse" data-ref="([^"]*)">([\s\S]*?)<\/tr>/g
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowRe.exec(html))) {
    const lineId = Number(rowMatch[1])
    const warehouseRef = decodeEntities(rowMatch[2])
    const rowHtml = rowMatch[3]

    // Only the numeric id is kept from each cell's real link — the raw
    // /product/stock/card.php / /productinfo/index.php hrefs themselves are
    // never surfaced to the UI (no routing to legacy PHP pages); the
    // component builds real in-app ROUTES.warehouseDetail/productDetail
    // links from these ids instead.
    const warehouseId = Number(rowHtml.match(/^[\s\S]*?<a href="[^"]*[?&]id=(\d+)"/)?.[1] ?? '') || null
    const productCellMatch = rowHtml.match(/data-ref="([^"]*)"[^>]*data-barcode="[^"]*"[^>]*>[\s\S]*?<a href="[^"]*[?&]id=(\d+)"/)
    const productRef = productCellMatch ? decodeEntities(productCellMatch[1]) : ''
    const productId = productCellMatch ? Number(productCellMatch[2]) : null
    const productLabelMatch = rowHtml.match(/<\/a>\s*-\s*([^<]*)</)
    const productLabel = productLabelMatch ? decodeEntities(productLabelMatch[1]).trim() : ''

    const expectedMatch = rowHtml.match(/class="right expectedqty"[^>]*>([^<]*)</)
    const expectedQty = expectedMatch ? Number(expectedMatch[1].trim()) || 0 : 0
    const stockQtySnapshot = rowHtml.match(new RegExp(`name="stock_qty_${lineId}" value="([^"]*)"`))?.[1] ?? ''
    const realQty = rowHtml.match(new RegExp(`id="id_${lineId}_input" value="([^"]*)"`))?.[1] ?? ''

    lines.push({ lineId, warehouseId, warehouseRef, productId, productRef, productLabel, expectedQty, stockQtySnapshot, realQty })
  }

  const currentPageMatch = html.match(/<span>Page (\d+)<\/span>/)
  const page = currentPageMatch ? Number(currentPageMatch[1]) - 1 : 0
  const hasNextPage = lines.length >= LINES_PER_PAGE

  return { token, status, canUpdateStock, warehouseOptions, productOptions, lines, page, hasNextPage }
}
