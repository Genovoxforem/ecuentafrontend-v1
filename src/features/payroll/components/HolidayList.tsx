import { CalendarDays } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Holidays page — see PayrollLegacyList.
export function HolidayList() {
  return <PayrollLegacyList listKey="holiday" icon={CalendarDays} title="Holidays" addLabel="Add Holiday" addPath={ROUTES.payrollCalendarHolidaysCreate} />
}
