import { LeaveList } from '../../features/users/components/LeaveList'
import { ROUTES } from '../../routes'

export function PayrollLeaveListModule() {
  return <LeaveList newRequestPath={ROUTES.payrollLeaveRequest} />
}
