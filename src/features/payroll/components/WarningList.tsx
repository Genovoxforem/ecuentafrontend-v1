import { AlertTriangle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Warnings page — see PayrollLegacyList.
export function WarningList() {
  return <PayrollLegacyList listKey="warnings" icon={AlertTriangle} title="Warnings" addLabel="Add Warnings" addPath={ROUTES.payrollEmployeeWarningsCreate} />
}
