import { HandCoins } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Loan Details page — see PayrollLegacyList.
export function LoanList() {
  return <PayrollLegacyList listKey="loan" icon={HandCoins} title="Loan Details" addLabel="Request Loan" addPath={ROUTES.payrollEmployeeLoanCreate} />
}
