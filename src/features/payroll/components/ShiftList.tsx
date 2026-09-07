import { CalendarRange, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { useShiftRecords, useRecordShift, type ShiftRecord } from '../payrollLists.queries'

type Key = 'name' | 'type' | 'createdBy' | 'action'

export function ShiftList() {
  const rows = useShiftRecords()
  const recordShift = useRecordShift()

  const columns: PayrollListColumn<ShiftRecord, Key>[] = [
    { key: 'name', label: 'Shift Name', render: (r) => r.name, sortValue: (r) => r.name, exportValue: (r) => r.name },
    { key: 'type', label: 'Shift Type', render: (r) => r.shiftType, sortValue: (r) => r.shiftType, exportValue: (r) => r.shiftType },
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordShift.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={CalendarRange}
      title="Shifts"
      addLabel="Add Shift"
      addPath={ROUTES.payrollAssignShiftsCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.name} ${r.shiftType} ${r.createdBy}`}
      exportTitle="Shifts"
      localOnlyNote
    />
  )
}
