// Parses custom/zra/getpurchases_ajax.php's own DataTables rows (real,
// confirmed by reading that file directly against llx_zrapurchases,
// purchasestatus='0' hardcoded — only "not yet actioned" rows, matching
// the real "ZRA Purchases" page). Each row is a positional array of 6
// pre-formatted HTML strings (not a keyed object — confirmed from the
// file's own `$data[] = array($col0, $col1, $col2, $col3, $col4, $col5)`),
// so this parses by index rather than by key.

function cellText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function afterLabel(text: string, label: string): string {
  const m = text.match(new RegExp(label + ':\\s*([^|]*?)(?:\\s*(?:Item Count|Branch|Payment Type|Remark):|$)', 'i'))
  return m ? m[1].trim() : ''
}

function parseAmount(text: string): number {
  const n = Number(text.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export type RawAutomaticPurchaseRow = [string, string, string, string, string, string]

export interface AutomaticPurchaseRow {
  id: number | null
  invoiceNo: string
  saleDate: string
  itemCount: number
  supplierName: string
  supplierTpin: string
  supplierBranch: string
  receiptTypeCode: string
  paymentTypeCode: string
  confirmationDate: string
  remark: string
  totalAmount: number
  taxableAmount: number
  taxAmount: number
}

export function parseAutomaticPurchaseRow(raw: RawAutomaticPurchaseRow): AutomaticPurchaseRow {
  const [col0, col1, col2, col3, col4, col5] = raw
  const t0 = cellText(col0)
  const t1 = cellText(col1)
  const t2 = cellText(col2)
  const t3 = cellText(col3)
  const t4 = cellText(col4)

  const idMatch = col5.match(/data-invoice-id="(\d+)"/)
  const itemCountMatch = t0.match(/Item Count:\s*(\d+)/i)

  return {
    id: idMatch ? Number(idMatch[1]) : null,
    invoiceNo: t0.split('Sale Date:')[0]?.trim() ?? t0,
    saleDate: afterLabel(t0, 'Sale Date'),
    itemCount: itemCountMatch ? Number(itemCountMatch[1]) : 0,
    supplierName: t1.split('Supplier Tpin:')[0]?.trim() ?? t1,
    supplierTpin: afterLabel(t1, 'Supplier Tpin'),
    supplierBranch: afterLabel(t1, 'Branch'),
    receiptTypeCode: t2.split('Payment Type:')[0]?.trim() ?? t2,
    paymentTypeCode: afterLabel(t2, 'Payment Type'),
    confirmationDate: t3.split('Remark:')[0]?.trim() ?? t3,
    remark: afterLabel(t3, 'Remark'),
    totalAmount: parseAmount(t4.split('Taxable Amount:')[0] ?? '0'),
    taxableAmount: parseAmount(afterLabel(t4, 'Taxable Amount')),
    taxAmount: parseAmount(afterLabel(t4, 'Tax Amount')),
  }
}
