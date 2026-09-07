import { Clock3, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { useHourlyTemplateRecords, useRecordHourlyTemplate, type HourlyTemplateRecord } from '../payrollLists.queries'

type Key = 'createdBy' | 'grade' | 'rate' | 'action'

export function HourlyTemplateList() {
  const rows = useHourlyTemplateRecords()
  const recordHourlyTemplate = useRecordHourlyTemplate()

  const columns: PayrollListColumn<HourlyTemplateRecord, Key>[] = [
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    { key: 'grade', label: 'Hourly Grade', render: (r) => r.hourlyGrade, sortValue: (r) => r.hourlyGrade, exportValue: (r) => r.hourlyGrade },
    { key: 'rate', label: 'Hourly Rate', render: (r) => r.hourlyRate, align: 'right', exportValue: (r) => r.hourlyRate },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordHourlyTemplate.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={Clock3}
      title="Hourly Template"
      addLabel="Set Hourly Grade"
      addPath={ROUTES.payrollHourlyTemplateCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.hourlyGrade} ${r.createdBy}`}
      exportTitle="Hourly Template"
      localOnlyNote
    />
  )
}
