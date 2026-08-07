import { Users2, Users, CalendarPlus, Scale, Home, Globe } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ThirdPartyList, type ThirdPartyStatSpec } from '../../../shared/components/thirdParty/ThirdPartyList'
import type { CustomersSummary } from '../customers.queries'

export function CustomersList({ summary }: { summary: CustomersSummary }) {
  const stats: ThirdPartyStatSpec[] = [
    { label: 'Total Customers', value: summary.totalCustomers, caption: 'All customer records', icon: Users, color: 'blue' },
    { label: 'Created This Month', value: summary.createdThisMonth, caption: 'New Customers', icon: CalendarPlus, color: 'cyan' },
    { label: 'Outstanding Balance', value: fmtZMW(summary.outstandingBalance), caption: 'Open sales balance', icon: Scale, color: 'indigo' },
    { label: 'Default Customers', value: summary.defaultCountryCustomers, caption: 'Default country Customers', icon: Home, color: 'green' },
    { label: 'Other Country Customers', value: summary.otherCountryCustomers, caption: 'Foreign Customers', icon: Globe, color: 'amber' },
  ]

  return <ThirdPartyList icon={Users2} title="Customer List" newPath={ROUTES.customersCreate} newLabel="New Customer" stats={stats} rows={summary.customers} />
}
