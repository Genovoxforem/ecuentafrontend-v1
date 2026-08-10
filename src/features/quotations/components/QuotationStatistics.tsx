import { ChartPie } from 'lucide-react'
import { SalesStatsPage } from '../../../shared/components/dashboard/SalesStatsPage'

export function QuotationStatistics() {
  return <SalesStatsPage icon={ChartPie} title="Quotation's Statistics" entityLabel="Quotations" />
}
