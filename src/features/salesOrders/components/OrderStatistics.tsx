import { useMemo, useState } from 'react'
import { ChartPie } from 'lucide-react'
import { SalesStatsPage, type SalesStatsFilters } from '../../../shared/components/dashboard/SalesStatsPage'
import { useOrderStats } from '../orderStats.queries'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useThirdPartyFormOptions } from '../../customers/thirdPartyOptions.queries'

// Order status codes/labels — the classic statistics page's own object_status
// options (commande/stats/index.php), which it compares against fk_statut.
const STATUS_OPTIONS = [
  { value: '-1', label: 'Canceled' },
  { value: '0', label: 'Draft' },
  { value: '1', label: 'Validated' },
  { value: '2', label: 'Shipment In Process' },
  { value: '3', label: 'Delivered' },
]

export function OrderStatistics() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [socid, setSocid] = useState('')
  const [typentId, setTypentId] = useState('')
  const [categId, setCategId] = useState('')
  const [userid, setUserid] = useState('')
  const [status, setStatus] = useState('')

  const { data: customers } = useCustomerOptions()
  const { data: options } = useThirdPartyFormOptions()

  const { data: stats, isLoading, refetch } = useOrderStats(Number(year), { socid, typentId, categId, userid, status })

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
      title="Order's Statistics"
      entityLabel="Orders"
      stats={stats}
      isLoading={isLoading}
      year={year}
      onYearChange={setYear}
      filters={filters}
      onRefresh={() => refetch()}
    />
  )
}
