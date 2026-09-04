import { AlertTriangle, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useWarningRecords, useRecordWarning, type WarningRecord } from '../payrollLists.queries'

type Key = 'createdBy' | 'by' | 'to' | 'subject' | 'date' | 'description' | 'action'

export function WarningList() {
  const rows = useWarningRecords()
  const recordWarning = useRecordWarning()

  const columns: PayrollListColumn<WarningRecord, Key>[] = [
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    { key: 'by', label: 'Warnings By', render: (r) => r.warningByName, sortValue: (r) => r.warningByName, exportValue: (r) => r.warningByName },
    { key: 'to', label: 'Warnings To', render: (r) => r.warningToName, sortValue: (r) => r.warningToName, exportValue: (r) => r.warningToName },
    { key: 'subject', label: 'Subject', render: (r) => r.subject, sortValue: (r) => r.subject, exportValue: (r) => r.subject },
    { key: 'date', label: 'Warning Date', render: (r) => formatDate(r.warningDate), sortValue: (r) => r.warningDate, exportValue: (r) => formatDate(r.warningDate) },
    { key: 'description', label: 'Description', render: (r) => r.description || '—', exportValue: (r) => r.description },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordWarning.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={AlertTriangle}
      title="Warnings"
      addLabel="Add Warnings"
      addPath={ROUTES.payrollEmployeeWarningsCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.warningByName} ${r.warningToName} ${r.subject} ${r.createdBy}`}
      exportTitle="Warnings"
      localOnlyNote
    />
  )
}
