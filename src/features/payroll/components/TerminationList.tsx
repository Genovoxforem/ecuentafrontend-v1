import { UserX, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useTerminationRecords, useRecordTermination, type TerminationRecord } from '../payrollLists.queries'

type Key = 'createdBy' | 'employee' | 'type' | 'notice' | 'termination' | 'description' | 'action'

export function TerminationList() {
  const rows = useTerminationRecords()
  const recordTermination = useRecordTermination()

  const columns: PayrollListColumn<TerminationRecord, Key>[] = [
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    { key: 'employee', label: 'Employee Name', render: (r) => r.employeeName, sortValue: (r) => r.employeeName, exportValue: (r) => r.employeeName },
    { key: 'type', label: 'Termination Type', render: (r) => r.terminationType, sortValue: (r) => r.terminationType, exportValue: (r) => r.terminationType },
    { key: 'notice', label: 'Notice Date', render: (r) => formatDate(r.noticeDate), sortValue: (r) => r.noticeDate, exportValue: (r) => formatDate(r.noticeDate) },
    {
      key: 'termination',
      label: 'Termination Date',
      render: (r) => formatDate(r.terminationDate),
      sortValue: (r) => r.terminationDate,
      exportValue: (r) => formatDate(r.terminationDate),
    },
    { key: 'description', label: 'Description', render: (r) => r.description || '—', exportValue: (r) => r.description },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordTermination.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={UserX}
      title="Terminations"
      addLabel="Add Termination"
      addPath={ROUTES.payrollEmployeeTerminationsCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.employeeName} ${r.terminationType} ${r.createdBy}`}
      exportTitle="Terminations"
      localOnlyNote
    />
  )
}
