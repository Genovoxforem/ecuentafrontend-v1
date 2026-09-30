import { Gauge } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Indicator page — see PayrollLegacyList.
export function IndicatorList() {
  return <PayrollLegacyList listKey="indicator" icon={Gauge} title="Indicator" addLabel="Add Indicator" addPath={ROUTES.payrollEmployeeIndicatorCreate} />
}
