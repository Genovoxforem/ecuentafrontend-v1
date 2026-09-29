import { describe, expect, it } from 'vitest'
import { resolveLegacyRoute } from './legacyRoute'

describe('resolveLegacyRoute', () => {
  it('maps object cards to their React detail routes', () => {
    expect(resolveLegacyRoute('/commande/card.php?id=12')).toBe('/orders/12')
    expect(resolveLegacyRoute('/comm/propal/card.php?id=7')).toBe('/quotations/7')
    expect(resolveLegacyRoute('/compta/facture/card.php?facid=5&save_lastsearch_values=1')).toBe('/invoices/5')
    expect(resolveLegacyRoute('/fourn/commande/card.php?id=3')).toBe('/purchase-orders/3')
    expect(resolveLegacyRoute('/fourn/facture/card.php?facid=9')).toBe('/vendor-invoices/9')
    expect(resolveLegacyRoute('/societe/card.php?socid=41')).toBe('/customers/41')
  })

  it("maps Ecuenta's own invoice paths to the same invoices", () => {
    expect(resolveLegacyRoute('/compta/sales/card.php?facid=289')).toBe('/invoices/289')
    expect(resolveLegacyRoute('/fourn/purchase/card.php?id=183')).toBe('/vendor-invoices/183')
    expect(resolveLegacyRoute('/productinfo/index.php?id=169')).toBe('/products/169')
    // The expense report link of the accounting files list carries a line id too.
    expect(resolveLegacyRoute('/expensereport/card.php?id=9&detail_id=13')).toBe('/expenses/list/9')
    // The expense module's own card and the user profile page.
    expect(resolveLegacyRoute('/expense/card.php?id=9#approvals')).toBe('/expenses/card/9')
    expect(resolveLegacyRoute('/userprofile/index.php?id=16&save_lastsearch_values=1')).toBe('/users-dashboard/16')
  })

  it('strips the /<dir>/htdocs prefix and accepts absolute URLs', () => {
    expect(resolveLegacyRoute('/dolibarr/htdocs/commande/card.php?id=4')).toBe('/orders/4')
    expect(resolveLegacyRoute('http://172.16.5.55/comm/propal/card.php?id=2')).toBe('/quotations/2')
  })

  it('does not confuse purchase documents with their sales counterparts', () => {
    expect(resolveLegacyRoute('/dolibarr/fourn/commande/card.php?id=3')).toBe('/purchase-orders/3')
    expect(resolveLegacyRoute('/dolibarr/commande/card.php?id=3')).toBe('/orders/3')
    expect(resolveLegacyRoute('/dolibarr/fourn/facture/card.php?facid=6')).toBe('/vendor-invoices/6')
    expect(resolveLegacyRoute('/dolibarr/compta/facture/card.php?facid=6')).toBe('/invoices/6')
    expect(resolveLegacyRoute('/product/stock/card.php?id=2')).toBe('/warehouses/2')
    expect(resolveLegacyRoute('/product/inventory/card.php?id=5')).toBe('/warehouses/inventory/5')
  })

  it('returns null for objects with no React page or no usable id', () => {
    expect(resolveLegacyRoute('/reception/card.php?id=1')).toBeNull()
    expect(resolveLegacyRoute('/comm/action/card.php?id=8')).toBeNull()
    expect(resolveLegacyRoute('/commande/card.php')).toBeNull()
    expect(resolveLegacyRoute('/commande/card.php?id=abc')).toBeNull()
    expect(resolveLegacyRoute('')).toBeNull()
    expect(resolveLegacyRoute(null)).toBeNull()
  })
})
