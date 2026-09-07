import { Plane, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useTravelRecords, useRecordTravel, type TravelRecord } from '../payrollLists.queries'

type Key = 'employee' | 'start' | 'end' | 'purpose' | 'country' | 'description' | 'createdBy' | 'action'

export function TravelList() {
  const rows = useTravelRecords()
  const recordTravel = useRecordTravel()

  const columns: PayrollListColumn<TravelRecord, Key>[] = [
    { key: 'employee', label: 'Employee Name', render: (r) => r.employeeName, sortValue: (r) => r.employeeName, exportValue: (r) => r.employeeName },
    { key: 'start', label: 'Start Date', render: (r) => formatDate(r.startDate), sortValue: (r) => r.startDate, exportValue: (r) => formatDate(r.startDate) },
    { key: 'end', label: 'End Date', render: (r) => formatDate(r.endDate), sortValue: (r) => r.endDate, exportValue: (r) => formatDate(r.endDate) },
    { key: 'purpose', label: 'Purpose Of Trip', render: (r) => r.purpose, exportValue: (r) => r.purpose },
    { key: 'country', label: 'Country', render: (r) => r.country, sortValue: (r) => r.country, exportValue: (r) => r.country },
    { key: 'description', label: 'Description', render: (r) => r.description || '—', exportValue: (r) => r.description },
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordTravel.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={Plane}
      title="Travel"
      addLabel="Add Travel"
      addPath={ROUTES.payrollEmployeeTravelCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.employeeName} ${r.country} ${r.purpose} ${r.createdBy}`}
      exportTitle="Travel"
      localOnlyNote
    />
  )
}
