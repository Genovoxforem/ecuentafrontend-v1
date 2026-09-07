import { Banknote } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'
import { ROUTES } from '../../../../routes'

// salaries/list.php — classic Dolibarr list, no JSON for the grid itself.
// The page's own "Pending" acknowledgement toggle IS a real JSON write
// (salaries/acknowledgeaction.php) but there is no reachable Ref/row data to
// attach it to without a real list read API, so it isn't reproduced here.
export function SalaryListPage() {
  return (
    <InertListPage
      icon={Banknote}
      title="Salary List"
      sourcePath="salaries/list.php"
      columns={['Ref', 'Employee', 'Label', 'Date Payment', 'Date Value', 'Payment Mode', 'Bank Account', 'Paid']}
      addLabel="New Payment - Salaries"
      addPath={ROUTES.ledgerSalaryPaymentCreate}
    />
  )
}
