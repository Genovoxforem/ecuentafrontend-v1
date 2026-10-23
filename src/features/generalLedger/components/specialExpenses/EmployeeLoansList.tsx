import { HandCoins } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { loadLoans } from '../../specialPaymentsFapi'
import { LegacyListPage } from '../LegacyListPage'

// loan/fapi/list.php — the entity's loans with what is paid and what remains.
export function EmployeeLoansList() {
  return <LegacyListPage icon={HandCoins} title="Employee Loans" path="/loan/fapi/list.php" firstHeader={/^Ref/} load={loadLoans} addTo={{ label: 'New Loan', to: ROUTES.ledgerLoanCreate }} />
}
