import { Gauge } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'

interface IndicatorRow {
  createdBy: string
  designation: string
}

type Key = 'createdBy' | 'designation' | 'action'

// Always empty — payroll/indicator.php's "Add Indicator" panel is inert by
// design (see IndicatorForm.tsx's comment: its reveal flow depends on an
// HTML-fragment endpoint with no JSON contract, so there's no honest way to
// create a row here either).
const ROWS: IndicatorRow[] = []

export function IndicatorList() {
  const columns: PayrollListColumn<IndicatorRow, Key>[] = [
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy },
    { key: 'designation', label: 'Designation', render: (r) => r.designation },
    { key: 'action', label: 'Action', render: () => null },
  ]

  return (
    <PayrollRecordList
      icon={Gauge}
      title="Indicator"
      addLabel="Add Indicator"
      addPath={ROUTES.payrollEmployeeIndicatorCreate}
      columns={columns}
      rows={ROWS}
      getRowKey={(r) => `${r.createdBy}-${r.designation}`}
      getSearchText={(r) => `${r.createdBy} ${r.designation}`}
      exportTitle="Indicator"
    />
  )
}
