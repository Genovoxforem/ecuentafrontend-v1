import { Plane } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Travel page — see PayrollLegacyList.
export function TravelList() {
  return <PayrollLegacyList listKey="travel" icon={Plane} title="Travel" addLabel="Add Travel" addPath={ROUTES.payrollEmployeeTravelCreate} />
}
