import { HandCoins } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { loadLoans } from '../../specialPaymentsFapi'
import { JsonListPage } from '../JsonListPage'

// loan/fapi/list.php — the entity's loans with what is paid and what remains.
export function EmployeeLoansList() {
  return <JsonListPage icon={HandCoins} title="Employee Loans" queryKey="/loan/fapi/list.php" load={loadLoans} addTo={{ label: 'New Loan', to: ROUTES.ledgerLoanCreate }} />
}
