import { PurchaseStatsPage } from '../../purchases/components/PurchaseStatsPage'

// fourn/commande/fapi/stats.php: CommandeStats in supplier mode, the class the chart page instantiates, with the same filters
// as the vendor invoice and vendor proposal statistics.
export function PurchaseOrderStatistics() {
  return <PurchaseStatsPage base="/fourn/commande/fapi" title="Purchase order statistics" entityLabel="Orders" />
}
