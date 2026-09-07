import { CalendarDays, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useHolidayRecords, useRecordHoliday, type HolidayRecord } from '../payrollLists.queries'

type Key = 'si' | 'leave' | 'day' | 'entity' | 'note' | 'action'

export function HolidayList() {
  const rows = useHolidayRecords()
  const recordHoliday = useRecordHoliday()

  const columns: PayrollListColumn<HolidayRecord, Key>[] = [
    { key: 'si', label: 'SI', render: (r) => rows.indexOf(r) + 1, align: 'right' },
    { key: 'leave', label: 'Leave', render: (r) => r.leaveName, sortValue: (r) => r.leaveName, exportValue: (r) => r.leaveName },
    {
      key: 'day',
      label: 'Day',
      render: (r) => (r.endDate && r.endDate !== r.startDate ? `${formatDate(r.startDate)} – ${formatDate(r.endDate)}` : formatDate(r.startDate)),
      sortValue: (r) => r.startDate,
      exportValue: (r) => (r.endDate && r.endDate !== r.startDate ? `${formatDate(r.startDate)} – ${formatDate(r.endDate)}` : formatDate(r.startDate)),
    },
    { key: 'entity', label: 'Entity', render: (r) => r.entity, exportValue: (r) => r.entity },
    { key: 'note', label: 'Note', render: (r) => r.note || '—', exportValue: (r) => r.note },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordHoliday.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={CalendarDays}
      title="Holidays"
      addLabel="Add Holiday"
      addPath={ROUTES.payrollCalendarHolidaysCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.leaveName} ${r.entity} ${r.note}`}
      exportTitle="Holidays"
      localOnlyNote
    />
  )
}
