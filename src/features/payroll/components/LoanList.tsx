import { HandCoins, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useLoanRecords, useRecordLoan, type LoanRecord } from '../payrollLists.queries'

type Key = 'createdBy' | 'employee' | 'amount' | 'period' | 'instalment' | 'deductFrom' | 'requestDate' | 'status' | 'action'

const STATUS_STYLES: Record<LoanRecord['status'], string> = {
  Waiting: 'bg-info-bg text-info-fg',
  'Loan Accepted': 'bg-success-bg text-success-fg',
  Rejected: 'bg-danger-bg text-danger-fg',
}

export function LoanList() {
  const rows = useLoanRecords()
  const recordLoan = useRecordLoan()

  const columns: PayrollListColumn<LoanRecord, Key>[] = [
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    { key: 'employee', label: 'Employee Name', render: (r) => r.employeeName, sortValue: (r) => r.employeeName, exportValue: (r) => r.employeeName },
    { key: 'amount', label: 'Loan Amount', render: (r) => r.loanAmount, align: 'right', exportValue: (r) => r.loanAmount },
    { key: 'period', label: 'Period', render: (r) => `${r.periodMonths} mo`, exportValue: (r) => r.periodMonths },
    { key: 'instalment', label: 'Instalment', render: (r) => r.installment, align: 'right', exportValue: (r) => r.installment },
    {
      key: 'deductFrom',
      label: 'Deduct From',
      render: (r) => formatDate(r.deductFrom),
      sortValue: (r) => r.deductFrom,
      exportValue: (r) => formatDate(r.deductFrom),
    },
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
        <button type="button" onClick={() => recordLoan.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={HandCoins}
      title="Loan Details"
      addLabel="Request Loan"
      addPath={ROUTES.payrollEmployeeLoanCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.employeeName} ${r.createdBy} ${r.status}`}
      exportTitle="Loan Details"
      localOnlyNote
    />
  )
}
