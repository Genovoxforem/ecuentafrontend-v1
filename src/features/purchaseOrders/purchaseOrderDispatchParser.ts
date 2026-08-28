// Parses fourn/commande/dispatch.php?id=X — the real "Item Receipts" tab.
// Only the top info block (Date/Method/Request author — same
// table.table-borderless pattern as card.php, see purchaseOrderCardParser.ts's
// findRowValue) and the real, historical "Receipts for this order" table
// (#dispatch_received_products, read directly from dispatch.php's own
// source) are parsed here. The interactive per-line "Qty To Dispatch" entry
// form + Create Reception button above that table is its own large,
// stateful sub-workflow (per-line warehouse/lot/serial/eat-by/sell-by
// tracking) — not replicated natively yet; PurchaseOrderDetail.tsx links out
// to this same real page for that action instead.

import { findRowValue, text } from './purchaseOrderCardParser'

export interface PurchaseOrderReceiptRow {
  receptionRef: string
  receptionUrl: string
  productRef: string
  productLabel: string
  creationDate: string
  plannedDeliveryDate: string
  qtyDispatched: string
  warehouse: string
  comment: string
}

export interface PurchaseOrderDispatchData {
  date: string
  method: string
  requestAuthor: string
  receipts: PurchaseOrderReceiptRow[]
}

export function parsePurchaseOrderDispatch(html: string): PurchaseOrderDispatchData {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const receipts: PurchaseOrderReceiptRow[] = []
  const table = doc.querySelector('#dispatch_received_products')
  if (table) {
    const rows = Array.from(table.querySelectorAll('tr.oddeven'))
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll(':scope > td'))
      if (cells.length < 6) continue
      const receptionLink = cells[0]?.querySelector('a')
      const productLink = cells[1]?.querySelector('a')
      // "<a>REF</a> - LABEL" — the label is the <td>'s own trailing text node
      // after the product link, same "exclude the linked element's own text
      // node boundary" pattern used throughout this feature's parsers.
      const productCellText = text(cells[1])
      const productRef = text(productLink)
      const productLabel = productCellText.startsWith(productRef) ? productCellText.slice(productRef.length).replace(/^\s*-\s*/, '') : productCellText

      // Qty/Warehouse/Comment located by their own real classes rather than
      // a fixed index — dispatch.php's real column count varies with
      // whether the reception/productbatch modules are enabled (extra
      // Reception/batch/eat-by/sell-by columns can appear in between), but
      // these 3 classes are stable regardless: `custumRight` on the Qty
      // cell, `tdoverflowmax300` on the Comment cell, and Warehouse is
      // always the cell immediately between them.
      const qtyCell = row.querySelector('td.custumRight')
      const commentCell = row.querySelector('td.tdoverflowmax300')
      const warehouseCell = qtyCell?.nextElementSibling ?? null

      receipts.push({
        receptionRef: text(receptionLink),
        receptionUrl: receptionLink?.getAttribute('href') ?? '',
        productRef,
        productLabel,
        creationDate: text(cells[2]),
        plannedDeliveryDate: text(cells[3]),
        qtyDispatched: text(qtyCell),
        warehouse: text(warehouseCell),
        comment: text(commentCell),
      })
    }
  }

  return {
    date: text(findRowValue(doc, 'Date')),
    method: text(findRowValue(doc, 'Method')),
    requestAuthor: text(findRowValue(doc, 'Request author')),
    receipts,
  }
}
