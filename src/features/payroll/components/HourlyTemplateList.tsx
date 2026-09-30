import { Clock3 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Hourly Template page — see PayrollLegacyList.
export function HourlyTemplateList() {
  return <PayrollLegacyList listKey="hourlyTemplate" icon={Clock3} title="Hourly Template" addLabel="Set Hourly Grade" addPath={ROUTES.payrollHourlyTemplateCreate} />
}
