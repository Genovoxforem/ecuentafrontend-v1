import { Users2, Truck, CalendarPlus, Scale, Home, Globe } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ThirdPartyList, type ThirdPartyStatSpec } from '../../../shared/components/thirdParty/ThirdPartyList'
import type { VendorsSummary } from '../vendors.queries'

export function VendorsList({ summary }: { summary: VendorsSummary }) {
  const stats: ThirdPartyStatSpec[] = [
    { label: 'Total Vendors', value: summary.totalVendors, caption: 'All vendor records', icon: Truck, color: 'blue' },
    { label: 'Created This Month', value: summary.createdThisMonth, caption: 'New Vendors', icon: CalendarPlus, color: 'cyan' },
    { label: 'Outstanding Balance', value: fmtZMW(summary.outstandingBalance), caption: 'Open purchase balance', icon: Scale, color: 'indigo' },
    { label: 'Default Vendors', value: summary.defaultCountryVendors, caption: 'Default country Vendors', icon: Home, color: 'green' },
    { label: 'Other Country Vendors', value: summary.otherCountryVendors, caption: 'Foreign Vendors', icon: Globe, color: 'amber' },
  ]

  return <ThirdPartyList icon={Users2} title="Vendor List" newPath={ROUTES.vendorCreate} newLabel="New Vendor" stats={stats} rows={summary.vendors} />
}
