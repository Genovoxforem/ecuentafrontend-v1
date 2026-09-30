import { MessageSquareWarning } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Complaints page — see PayrollLegacyList.
export function ComplaintList() {
  return <PayrollLegacyList listKey="complaints" icon={MessageSquareWarning} title="Complaints" addLabel="Add Complaints" addPath={ROUTES.payrollEmployeeComplaintsCreate} />
}
