import { useParams } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// Native replacement for linking out to expense/card.php?id=X — the
// expense/ module is a modern custom-built SPA (confirmed this session:
// its own internal tab-bar include is commented out), but this specific
// card.php still has no JSON API for its detail/line-items view. Fields
// below match the real card's own field set (header info already shown in
// ExpenseReportsList; this replicates the per-record detail/lines view).
export function ExpenseReportDetailReplica() {
  const { id } = useParams<{ id: string }>()

  return (
    <DisabledFormPage
      icon={Receipt}
      title={`Expense Report #${id}`}
      sourcePath={`expense/card.php?id=${id}`}
      sections={[
        { fields: [{ label: 'Payment Mode', type: 'select' }, { label: 'Description', type: 'textarea' }] },
        {
          heading: 'Expense Lines',
          fields: [{ label: 'Date', type: 'date' }, { label: 'Category', type: 'select' }, { label: 'Description' }, { label: 'Amount' }],
        },
      ]}
    />
  )
}
