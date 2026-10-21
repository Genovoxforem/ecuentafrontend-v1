import { PurchaseStatsPage } from '../../purchases/components/PurchaseStatsPage'

// fourn/facture/fapi/stats.php: FactureStats in supplier mode (the number, the net amount and the average of
// vendor invoices by month and year), not totals worked out in the browser from the whole list.
export function VendorInvoiceStatisticsPage() {
  return <PurchaseStatsPage base="/fourn/facture/fapi" title="Vendor invoices statistics" entityLabel="Invoices" />
}
