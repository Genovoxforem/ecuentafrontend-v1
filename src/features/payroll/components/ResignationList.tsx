import { LogOut, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useResignationRecords, useRecordResignation, type ResignationRecord } from '../payrollLists.queries'

type Key = 'employee' | 'resignDate' | 'lastDay' | 'reason' | 'createdBy' | 'action'

export function ResignationList() {
  const rows = useResignationRecords()
  const recordResignation = useRecordResignation()

  const columns: PayrollListColumn<ResignationRecord, Key>[] = [
    { key: 'employee', label: 'Employee Name', render: (r) => r.employeeName, sortValue: (r) => r.employeeName, exportValue: (r) => r.employeeName },
    {
      key: 'resignDate',
      label: 'Resign Date',
      render: (r) => formatDate(r.resignationDate),
      sortValue: (r) => r.resignationDate,
      exportValue: (r) => formatDate(r.resignationDate),
    },
    {
      key: 'lastDay',
      label: 'Last Working Day',
      render: (r) => formatDate(r.lastWorkingDay),
      sortValue: (r) => r.lastWorkingDay,
      exportValue: (r) => formatDate(r.lastWorkingDay),
    },
    { key: 'reason', label: 'Reason', render: (r) => r.reason || '—', exportValue: (r) => r.reason },
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordResignation.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={LogOut}
      title="Resignations"
      addLabel="Add Resignation"
      addPath={ROUTES.payrollEmployeeResignationCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.employeeName} ${r.reason} ${r.createdBy}`}
      exportTitle="Resignations"
      localOnlyNote
    />
  )
}
