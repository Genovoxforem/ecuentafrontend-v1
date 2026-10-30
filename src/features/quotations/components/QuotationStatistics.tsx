import { useMemo, useState } from 'react'
import { ChartPie } from 'lucide-react'
import { SalesStatsPage, type SalesStatsFilters } from '../../../shared/components/dashboard/SalesStatsPage'
import { useQuotationStats } from '../quotationStats.queries'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useThirdPartyFormOptions } from '../../customers/thirdPartyOptions.queries'

// The status list of the classic quotation statistics page (comm/propal/stats/index.php, object_status), as it prints it.
const STATUS_OPTIONS = [
  { value: '0', label: 'Draft (needs to be validated)' },
  { value: '1', label: 'Validated (proposal is open)' },
  { value: '2', label: 'Signed (needs billing)' },
  { value: '3', label: 'Not signed (closed)' },
  { value: '4', label: 'Billed' },
]

// comm/propal/fapi/stats.php: PropaleStats, the class the classic page builds from these filters.
export function QuotationStatistics() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [socid, setSocid] = useState('')
  const [typentId, setTypentId] = useState('')
  const [categId, setCategId] = useState('')
  const [userid, setUserid] = useState('')
  const [status, setStatus] = useState('')

  const { data: customers } = useCustomerOptions()
  const { data: options } = useThirdPartyFormOptions()
  const { data: stats, isLoading, refetch } = useQuotationStats(Number(year), { socid, userid, typentId, categId, status })

  const customerOptions = useMemo(() => (customers ?? []).map((c) => ({ value: c.id, label: c.name })), [customers])

  const filters: SalesStatsFilters = {
    thirdParty: { value: socid, onChange: setSocid, options: customerOptions },
    thirdPartyType: { value: typentId, onChange: setTypentId, options: options?.thirdPartyTypes ?? [] },
    category: { value: categId, onChange: setCategId, options: options?.custCategories ?? [] },
    createdBy: { value: userid, onChange: setUserid, options: options?.salesReps ?? [] },
    status: { value: status, onChange: setStatus, options: STATUS_OPTIONS },
  }

  return (
    <SalesStatsPage
      icon={ChartPie}
      title="Quotation's Statistics"
      entityLabel="Quotations"
      stats={stats}
      isLoading={isLoading}
      year={year}
      onYearChange={setYear}
      filters={filters}
      onRefresh={() => refetch()}
    />
  )
}
