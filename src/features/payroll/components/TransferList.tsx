import { ArrowRightLeft, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useTransferRecords, useRecordTransfer, type TransferRecord } from '../payrollLists.queries'

type Key = 'employee' | 'date' | 'description' | 'createdBy' | 'action'

export function TransferList() {
  const rows = useTransferRecords()
  const recordTransfer = useRecordTransfer()

  const columns: PayrollListColumn<TransferRecord, Key>[] = [
    { key: 'employee', label: 'Employee Name', render: (r) => r.employeeName, sortValue: (r) => r.employeeName, exportValue: (r) => r.employeeName },
    { key: 'date', label: 'Transfer Date', render: (r) => formatDate(r.transferDate), sortValue: (r) => r.transferDate, exportValue: (r) => formatDate(r.transferDate) },
    { key: 'description', label: 'Description', render: (r) => r.description || '—', exportValue: (r) => r.description },
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordTransfer.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={ArrowRightLeft}
      title="Transfers"
      addLabel="Add Transfer"
      addPath={ROUTES.payrollEmployeeTransfersCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.employeeName} ${r.description} ${r.createdBy}`}
      exportTitle="Transfers"
      localOnlyNote
    />
  )
}
