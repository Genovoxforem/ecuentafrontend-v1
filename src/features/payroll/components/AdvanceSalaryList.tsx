import { Banknote, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useAdvanceSalaryRecords, useRecordAdvanceSalary, type AdvanceSalaryRecord } from '../payrollLists.queries'

type Key = 'createdBy' | 'employee' | 'amount' | 'month' | 'requestDate' | 'status' | 'action'

const STATUS_STYLES: Record<AdvanceSalaryRecord['status'], string> = {
  Waiting: 'bg-info-bg text-info-fg',
  Accepted: 'bg-success-bg text-success-fg',
  Rejected: 'bg-danger-bg text-danger-fg',
  'Amount Deducted': 'bg-success-bg text-success-fg',
}

function formatMonth(value: string) {
  if (!value) return ''
  const [year, month] = value.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function AdvanceSalaryList() {
  const rows = useAdvanceSalaryRecords()
  const recordAdvanceSalary = useRecordAdvanceSalary()

  const columns: PayrollListColumn<AdvanceSalaryRecord, Key>[] = [
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    { key: 'employee', label: 'Employee Name', render: (r) => r.employeeName, sortValue: (r) => r.employeeName, exportValue: (r) => r.employeeName },
    { key: 'amount', label: 'Amount', render: (r) => r.amount, align: 'right', exportValue: (r) => r.amount },
    { key: 'month', label: 'Deduct Month', render: (r) => formatMonth(r.deductMonth), sortValue: (r) => r.deductMonth, exportValue: (r) => formatMonth(r.deductMonth) },
    {
      key: 'requestDate',
      label: 'Request Date',
      render: (r) => formatDate(r.requestDate),
      sortValue: (r) => r.requestDate,
      exportValue: (r) => formatDate(r.requestDate),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
    },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordAdvanceSalary.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={Banknote}
      title="Advance Salary"
      addLabel="Request Advance"
      addPath={ROUTES.payrollAdvanceSalaryCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.employeeName} ${r.createdBy} ${r.status}`}
      exportTitle="Advance Salary"
      localOnlyNote
    />
  )
}
