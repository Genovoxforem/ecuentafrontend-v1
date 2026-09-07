import { Star } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'

interface AppraisalRow {
  createdBy: string
  employeeName: string
  month: string
  comments: string
}

type Key = 'createdBy' | 'employee' | 'month' | 'comments' | 'action'

// Always empty — payroll/appraisal.php's "Give Performance Appraisal" panel
// is inert by design (see AppraisalForm.tsx's comment: same HTML-fragment
// reveal-flow limitation as Indicator, so there's no honest way to create a
// row here either).
const ROWS: AppraisalRow[] = []

export function AppraisalList() {
  const columns: PayrollListColumn<AppraisalRow, Key>[] = [
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy },
    { key: 'employee', label: 'Employee Name', render: (r) => r.employeeName },
    { key: 'month', label: 'Month', render: (r) => r.month },
    { key: 'comments', label: 'Comments', render: (r) => r.comments },
    { key: 'action', label: 'Action', render: () => null },
  ]

  return (
    <PayrollRecordList
      icon={Star}
      title="Appraisal"
      addLabel="Give Appraisal"
      addPath={ROUTES.payrollEmployeeAppraisalCreate}
      columns={columns}
      rows={ROWS}
      getRowKey={(r) => `${r.createdBy}-${r.employeeName}-${r.month}`}
      getSearchText={(r) => `${r.createdBy} ${r.employeeName}`}
      exportTitle="Appraisal"
    />
  )
}
