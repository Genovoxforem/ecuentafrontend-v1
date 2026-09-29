import { CalendarRange } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Shifts page — see PayrollLegacyList.
export function ShiftList() {
  return <PayrollLegacyList listKey="shifts" icon={CalendarRange} title="Shifts" addLabel="Add Shift" addPath={ROUTES.payrollAssignShiftsCreate} />
}
