import { Award } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Employee Award page — see PayrollLegacyList.
export function AwardList() {
  return <PayrollLegacyList listKey="award" icon={Award} title="Employee Award" addLabel="Give Award" addPath={ROUTES.payrollEmployeeAwardCreate} />
}
