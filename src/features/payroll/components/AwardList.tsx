import { Award, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useAwardRecords, useRecordAward, type AwardRecord } from '../payrollLists.queries'

type Key = 'createdBy' | 'employee' | 'award' | 'gift' | 'amount' | 'month' | 'date' | 'comments' | 'action'

export function AwardList() {
  const rows = useAwardRecords()
  const recordAward = useRecordAward()

  const columns: PayrollListColumn<AwardRecord, Key>[] = [
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    { key: 'employee', label: 'Employee Name', render: (r) => r.employeeName, sortValue: (r) => r.employeeName, exportValue: (r) => r.employeeName },
    { key: 'award', label: 'Award Name', render: (r) => r.award, sortValue: (r) => r.award, exportValue: (r) => r.award },
    { key: 'gift', label: 'Gift', render: (r) => r.giftItem || '—', exportValue: (r) => r.giftItem },
    { key: 'amount', label: 'Amount', render: (r) => r.cashPrice || '—', align: 'right', exportValue: (r) => r.cashPrice },
    { key: 'month', label: 'Month', render: (r) => r.month, sortValue: (r) => r.month, exportValue: (r) => r.month },
    { key: 'date', label: 'Award Date', render: (r) => formatDate(r.awardDate), sortValue: (r) => r.awardDate, exportValue: (r) => formatDate(r.awardDate) },
    { key: 'comments', label: 'Comments', render: (r) => r.comments || '—', exportValue: (r) => r.comments },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordAward.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={Award}
      title="Employee Award"
      addLabel="Give Award"
      addPath={ROUTES.payrollEmployeeAwardCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.employeeName} ${r.award} ${r.createdBy}`}
      exportTitle="Employee Award"
      localOnlyNote
    />
  )
}
