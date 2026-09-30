import { Banknote } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Advance Salary page — see PayrollLegacyList.
export function AdvanceSalaryList() {
  return <PayrollLegacyList listKey="advance" icon={Banknote} title="Advance Salary" addLabel="Request Advance" addPath={ROUTES.payrollAdvanceSalaryCreate} />
}
