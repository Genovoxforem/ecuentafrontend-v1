import { LogOut } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Resignations page — see PayrollLegacyList.
export function ResignationList() {
  return <PayrollLegacyList listKey="resignations" icon={LogOut} title="Resignations" addLabel="Add Resignation" addPath={ROUTES.payrollEmployeeResignationCreate} />
}
