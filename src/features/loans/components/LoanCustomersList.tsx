import { Landmark, Users, CalendarPlus, Scale, Home, Globe } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ThirdPartyList, type ThirdPartyStatSpec } from '../../../shared/components/thirdParty/ThirdPartyList'
import type { CustomersSummary } from '../../customers/customers.queries'

// Real: the actual "Loan Customer" menu leaf points at
// loans_customer_list.php, whose own DataTable tries to load from
// societe/customer_ajax_list.php?type=c — confirmed absent from disk on
// this backend (see loans.queries.ts's header comment), so that real page's
// table never renders anything. "Loan customer" has no separate table of
// its own (loans_customer.php, the real "Create Loan Customer" target, is
// just Dolibarr's own societe/card.php) — it's a plain llx_societe
// customer row, so this reuses the exact same real data source already
// wired for the main Customers module (see CustomersList.tsx) rather than
// duplicating it.
export function LoanCustomersList({ summary }: { summary: CustomersSummary }) {
  const stats: ThirdPartyStatSpec[] = [
    { label: 'Total Customers', value: summary.totalCustomers, caption: 'All customer records', icon: Users, color: 'blue' },
    { label: 'Created This Month', value: summary.createdThisMonth, caption: 'New Customers', icon: CalendarPlus, color: 'cyan' },
    { label: 'Outstanding Balance', value: fmtZMW(summary.outstandingBalance), caption: 'Open sales balance', icon: Scale, color: 'indigo' },
    { label: 'Default Customers', value: summary.defaultCountryCustomers, caption: 'Default country Customers', icon: Home, color: 'green' },
    { label: 'Other Country Customers', value: summary.otherCountryCustomers, caption: 'Foreign Customers', icon: Globe, color: 'amber' },
  ]

  return <ThirdPartyList icon={Landmark} title="Loan Customer List" newPath={ROUTES.loanCustomerCreate} newLabel="New Loan Customer" stats={stats} rows={summary.customers} />
}
