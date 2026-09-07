import { FileSpreadsheet, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { useSalaryTemplateRecords, useRecordSalaryTemplate, type SalaryTemplateRecord } from '../payrollLists.queries'

type Key = 'salaryGrade' | 'currency' | 'grossSalary' | 'payeTax' | 'netSalary' | 'createdBy' | 'action'

export function SalaryTemplateList() {
  const rows = useSalaryTemplateRecords()
  const recordSalaryTemplate = useRecordSalaryTemplate()

  const columns: PayrollListColumn<SalaryTemplateRecord, Key>[] = [
    { key: 'salaryGrade', label: 'Salary Grades', render: (r) => r.salaryGrade, sortValue: (r) => r.salaryGrade, exportValue: (r) => r.salaryGrade },
    { key: 'currency', label: 'Currency', render: (r) => r.currency, exportValue: (r) => r.currency },
    {
      key: 'grossSalary',
      label: 'Gross Salary',
      render: (r) => r.grossSalary.toFixed(2),
      align: 'right',
      sortValue: (r) => r.grossSalary,
      exportValue: (r) => r.grossSalary.toFixed(2),
    },
    {
      key: 'payeTax',
      label: 'Paye Tax Enabled',
      render: (r) => (r.payeTaxEnabled ? 'Yes' : 'No'),
      sortValue: (r) => (r.payeTaxEnabled ? 1 : 0),
      exportValue: (r) => (r.payeTaxEnabled ? 'Yes' : 'No'),
    },
    {
      key: 'netSalary',
      label: 'Net Salary',
      render: (r) => r.netSalary.toFixed(2),
      align: 'right',
      sortValue: (r) => r.netSalary,
      exportValue: (r) => r.netSalary.toFixed(2),
    },
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordSalaryTemplate.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={FileSpreadsheet}
      title="Salary Template"
      addLabel="Set Salary Template"
      addPath={ROUTES.payrollSalaryTemplateCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.salaryGrade} ${r.createdBy}`}
      exportTitle="Salary Template"
      localOnlyNote
    />
  )
}
