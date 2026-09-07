import { HandCoins } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'
import { ROUTES } from '../../../../routes'

// loan/list.php — classic Dolibarr list, no JSON for the grid itself (its
// "all loans" side-panel widget on the card page IS real JSON — a
// DataTables server-side endpoint — but that's a navigation aid embedded in
// a single loan's own card, not this list).
export function EmployeeLoansList() {
  return (
    <InertListPage
      icon={HandCoins}
      title="Employee Loans"
      sourcePath="loan/list.php"
      columns={['Ref', 'Label', 'Third Party', 'Capital', 'Date Start', 'Valid Date', 'Status']}
      addLabel="New Loans"
      addPath={ROUTES.ledgerLoanCreate}
    />
  )
}
