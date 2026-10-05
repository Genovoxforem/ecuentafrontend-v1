import { describe, expect, it } from 'vitest'
import { parsePurchaseOrderListRow, type RawPurchaseOrderListRow } from './purchaseOrderListParser'

// A row of the real POST fourn/commande/purchase_ajax_list.php answer (tooltips
// shortened): the ref cell is the order's link, a document-link comment and an
// inline <script> whose source must not end up in the ref.
const REF_CELL =
  '<a href="/commande/purchaseorder/index_v2.php?id=9&save_lastsearch_values=1" data-geo="tip" class="classfortooltip"><span class="me-1 fas fa-dol-order_supplier"></span>PO2609-0009</a> <!-- html.formfile::getDocumentsLink --> <script> $(document).ready(function() { $(".dropdown dt a").on("click", function() { }); }); </script>'

const ROW: RawPurchaseOrderListRow = {
  product_ref: REF_CELL,
  label: '2334',
  pricedet: '<a href="/userprofile/index.php?id=1" data-geo="tip">Voxforem Admin</a>',
  desiredstock: '<div><a href="/fourn/card.php?socid=7" data-geo="tip"><div class="avatar-circle">TV</div>test Vendor</a></div><small>Vendor</small>',
  realstock: 'lusaka',
  virtualstock: '211021',
  virtualstock1: '',
  virtualstock2: '09/26/2026',
  virtualstock3: '45.00',
  virtualstock4: '<span class="badge badge-status1b badge-status">Validated</span>',
  virtualstock5: 'No',
}

describe('parsePurchaseOrderListRow', () => {
  it('reads the order id and ref from the order link of the current backend', () => {
    const row = parsePurchaseOrderListRow(ROW)
    expect(row.id).toBe(9)
    expect(row.ref).toBe('PO2609-0009')
    expect(row.refOrderVendor).toBe('2334')
    expect(row.thirdPartyName).toBe('test Vendor')
    expect(row.socid).toBe(7)
    expect(row.statusCode).toBe(1)
    expect(row.plannedDelivery).toBe('09/26/2026')
    expect(row.amountExclTax).toBe(45)
  })

  it('still reads the older fourn/commande/card.php link', () => {
    const row = parsePurchaseOrderListRow({ ...ROW, product_ref: '<a href="/fourn/commande/card.php?id=3&save_lastsearch_values=1">PO2609-0003</a>' })
    expect(row.id).toBe(3)
    expect(row.ref).toBe('PO2609-0003')
  })

  it('keeps the script out of the ref when the cell has no order link', () => {
    const row = parsePurchaseOrderListRow({ ...ROW, product_ref: '(PROV7) <script>$(document).ready(function() {});</script>' })
    expect(row.id).toBeNull()
    expect(row.ref).toBe('(PROV7)')
  })
})
