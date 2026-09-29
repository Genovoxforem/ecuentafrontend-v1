import { UserX } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Terminations page — see PayrollLegacyList.
export function TerminationList() {
  return <PayrollLegacyList listKey="terminations" icon={UserX} title="Terminations" addLabel="Add Termination" addPath={ROUTES.payrollEmployeeTerminationsCreate} />
}
