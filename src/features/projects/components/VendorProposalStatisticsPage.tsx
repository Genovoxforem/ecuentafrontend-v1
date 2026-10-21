import { PurchaseStatsPage } from '../../purchases/components/PurchaseStatsPage'

// supplier_proposal/fapi/stats.php: PropaleStats in supplier mode (the number, the net amount and the average of
// vendor proposals by month and year), replacing the classic comm/propal/stats page whose HTML and chart data were parsed.
export function VendorProposalStatisticsPage() {
  return <PurchaseStatsPage base="/supplier_proposal/fapi" title="Vendor proposals statistics" entityLabel="Proposals" />
}
