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

  it('maps the Sales invoice, payment, rebate, tag and import pages to their React pages', () => {
    expect(resolveLegacyRoute('/compta/facture/list.php?search_status=3&idmenu=1005619')).toBe('/invoices/abandoned')
    expect(resolveLegacyRoute('/compta/facture/list.php')).toBe('/invoices')
    expect(resolveLegacyRoute('/compta/facture/card.php?action=create&idmenu=1005615')).toBe('/invoices/create')
    expect(resolveLegacyRoute('/compta/facture/invoice.php?action=create')).toBe('/invoices/create/quick')
    expect(resolveLegacyRoute('/fourn/commande/list.php?idmenu=1005233&mainmenu=Ap')).toBe('/purchase-orders')
    expect(resolveLegacyRoute('/compta/facture/invoicetemplate_list.php?idmenu=1005620')).toBe('/invoices/templates')
    expect(resolveLegacyRoute('/compta/paiement/list.php?idmenu=1005621')).toBe('/payments')
    expect(resolveLegacyRoute('/custom/zra/rebate_list.php')).toBe('/invoices/rebates')
    expect(resolveLegacyRoute('/custom/zra/rebate_create.php?idmenu=683112529')).toBe('/invoices/rebates/create')
    expect(resolveLegacyRoute('/categories/index.php?type=2')).toBe('/customers/tags')
    expect(resolveLegacyRoute('/categories/index.php?type=customer')).toBe('/customers/tags')
    expect(resolveLegacyRoute('/categories/index.php?type=4')).toBe('/contacts/tags')
    expect(resolveLegacyRoute('/imports/import.php?step=2&datatoimport=societe_1&excludefirstline=2')).toBe('/import/customers?dataset=societe_1')
    expect(resolveLegacyRoute('/imports/import.php')).toBe('/import/customers')
    expect(resolveLegacyRoute('/contact/card.php?id=5')).toBe('/contacts/5')
    expect(resolveLegacyRoute('/commande/purchaseorder/index_v2.php?id=9&save_lastsearch_values=1')).toBe('/purchase-orders/9')
    expect(resolveLegacyRoute('/commande/purchaseorder/index_v2.php')).toBeNull()
  })

  it('maps every link of the classic home dashboard', () => {
    // Last 7 Sales / Purchases rows and their customer / supplier
    expect(resolveLegacyRoute('/compta/sales/card.php?facid=346')).toBe('/invoices/346')
    expect(resolveLegacyRoute('/fourn/purchase/card.php?id=183&save_lastsearch_values=1')).toBe('/vendor-invoices/183')
    expect(resolveLegacyRoute('/comm/card.php?socid=10')).toBe('/customers/10')
    // View All links and the attention rows
    expect(resolveLegacyRoute('/compta/facture/list.php?search_status=1')).toBe('/invoices?status=1')
    expect(resolveLegacyRoute('/fourn/facture/list.php')).toBe('/vendor-invoices')
    expect(resolveLegacyRoute('/comm/propal/list.php')).toBe('/quotations')
    expect(resolveLegacyRoute('/compta/bank/list.php')).toBe('/banking/accounts')
    expect(resolveLegacyRoute('/product/stock/list.php')).toBe('/warehouses/list')
    expect(resolveLegacyRoute('/custom/zra/zraindex.php')).toBe('/zra')
    // Quick actions
    expect(resolveLegacyRoute('/takeposnew/index.php')).toBe('/pos')
    expect(resolveLegacyRoute('/compta/facture/card.php?action=create')).toBe('/invoices/create')
    expect(resolveLegacyRoute('/product/card.php?action=create')).toBe('/products/create')
    expect(resolveLegacyRoute('/fourn/facture/card.php?action=create')).toBe('/vendor-invoices/create')
    expect(resolveLegacyRoute('/societe/card.php?action=create')).toBe('/customers/create')
    // …while the same pages with an id still open the record
    expect(resolveLegacyRoute('/product/card.php?id=5')).toBe('/products/5')
    expect(resolveLegacyRoute('/societe/card.php?socid=7')).toBe('/customers/7')
  })

  it('maps the purchase invoice views of fourn/facture/list.php', () => {
    expect(resolveLegacyRoute('/fourn/facture/importlist.php?type=02&code=M')).toBe('/vendor-invoices/manual')
    expect(resolveLegacyRoute('/fourn/facture/importlist.php?type=02&code=A')).toBe('/vendor-invoices/automatic')
    expect(resolveLegacyRoute('/fourn/facture/importlist.php?type=02&code=IE')).toBe('/vendor-invoices/marked-as-expense')
    expect(resolveLegacyRoute('/fourn/facture/importlist.php?type=01')).toBe('/vendor-invoices/imports')
    expect(resolveLegacyRoute('/fourn/facture/list.php?search_status=8')).toBe('/vendor-invoices/paid')
    expect(resolveLegacyRoute('/fourn/facture/list.php?search_status=9')).toBe('/vendor-invoices/not-paid')
    expect(resolveLegacyRoute('/fourn/facture/list.php?search_status=7')).toBe('/vendor-invoices?status=notSucceeded')
    expect(resolveLegacyRoute('/fourn/facture/purchase.php')).toBe('/vendor-invoices/create/quick')
  })

  it('leaves a tag page of another type, and an unsafe dataset code, alone', () => {
    expect(resolveLegacyRoute('/categories/index.php?type=0')).toBeNull()
    expect(resolveLegacyRoute('/imports/import.php?step=2&datatoimport=../x')).toBe('/import/customers')
  })

  it('returns null for objects with no React page or no usable id', () => {
    expect(resolveLegacyRoute('/reception/card.php?id=1')).toBeNull()
    expect(resolveLegacyRoute('/comm/action/card.php?id=8')).toBeNull()
    expect(resolveLegacyRoute('/commande/card.php')).toBeNull()
    expect(resolveLegacyRoute('/commande/card.php?id=abc')).toBeNull()
    expect(resolveLegacyRoute('')).toBeNull()
    expect(resolveLegacyRoute(null)).toBeNull()
  })

  it('maps the Kitchen and payroll Core HR menu pages to their React pages', () => {
    expect(resolveLegacyRoute('/kitchen/dashboard.php?idmenu=655112498')).toBe('/kitchen-dashboard')
    expect(resolveLegacyRoute('/kitchen/ordermanagement.php?type=supplement&idmenu=655112500')).toBe('/kitchen-beverage-orders')
    expect(resolveLegacyRoute('/kitchen/ordermanagement.php?idmenu=655112502')).toBe('/kitchen-order-management')
    expect(resolveLegacyRoute('/payroll/award.php?idmenu=655112325')).toBe('/payroll/employee-award')
    expect(resolveLegacyRoute('/payroll/resignations.php?action=create&idmenu=655112327')).toBe('/payroll/employee-resignation/new')
    expect(resolveLegacyRoute('/payroll/resignations.php')).toBe('/payroll/employee-resignation')
    // Payroll V2's own screens (features/payrollV2), told apart by the fragment.
    expect(resolveLegacyRoute('/payroll_v2/index.php#payrun?idmenu=655112317')).toBe('/payroll-v2/pay-runs')
    expect(resolveLegacyRoute('/payroll_v2/index.php#reports/summary?idmenu=655112322')).toBe('/payroll-v2/reports')
    expect(resolveLegacyRoute('/payroll_v2/ess.php?idmenu=655112318')).toBe('/payroll-v2/self-service')
    expect(resolveLegacyRoute('/payroll_v2/index.php#templates')).toBe('/payroll-v2/templates')
    expect(resolveLegacyRoute('/payroll_v2/index.php#shifts')).toBe('/payroll-v2/shifts')
    expect(resolveLegacyRoute('/payroll_v2/index.php#settings')).toBe('/payroll-v2/settings')
  })
})
