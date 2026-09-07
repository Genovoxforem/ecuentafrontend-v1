import { MessageSquareWarning, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { formatDate } from '../../../utils/format'
import { useComplaintRecords, useRecordComplaint, type ComplaintRecord } from '../payrollLists.queries'

type Key = 'createdBy' | 'from' | 'against' | 'title' | 'date' | 'description' | 'action'

export function ComplaintList() {
  const rows = useComplaintRecords()
  const recordComplaint = useRecordComplaint()

  const columns: PayrollListColumn<ComplaintRecord, Key>[] = [
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy, sortValue: (r) => r.createdBy, exportValue: (r) => r.createdBy },
    { key: 'from', label: 'Complaint From', render: (r) => r.complaintFromName, sortValue: (r) => r.complaintFromName, exportValue: (r) => r.complaintFromName },
    {
      key: 'against',
      label: 'Complaint Against',
      render: (r) => r.complaintAgainstName,
      sortValue: (r) => r.complaintAgainstName,
      exportValue: (r) => r.complaintAgainstName,
    },
    { key: 'title', label: 'Title', render: (r) => r.title, sortValue: (r) => r.title, exportValue: (r) => r.title },
    { key: 'date', label: 'Complaint Date', render: (r) => formatDate(r.complaintDate), sortValue: (r) => r.complaintDate, exportValue: (r) => formatDate(r.complaintDate) },
    { key: 'description', label: 'Description', render: (r) => r.description || '—', exportValue: (r) => r.description },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordComplaint.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={MessageSquareWarning}
      title="Complaints"
      addLabel="Add Complaints"
      addPath={ROUTES.payrollEmployeeComplaintsCreate}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.complaintFromName} ${r.complaintAgainstName} ${r.title} ${r.createdBy}`}
      exportTitle="Complaints"
      localOnlyNote
    />
  )
}
