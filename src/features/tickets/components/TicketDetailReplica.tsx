import { useParams } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// Native replacement for linking out to ticket/card.php?id=X — no JSON API
// for a single ticket's detail/message-thread exists over the session-
// cookie auth this app uses everywhere (the real REST class,
// ticket/class/api_tickets.class.php, requires a DOLAPIKEY this app never
// wires — deliberately, to stay consistent with every other feature).
// Fields below match the real card's own field set.
export function TicketDetailReplica() {
  const { id } = useParams<{ id: string }>()

  return (
    <DisabledFormPage
      icon={Ticket}
      title={`Ticket #${id}`}
      sourcePath={`ticket/card.php?id=${id}`}
      sections={[
        {
          fields: [
            { label: 'Subject', required: true },
            { label: 'Type', type: 'select' },
            { label: 'Category', type: 'select' },
            { label: 'Severity', type: 'select' },
            { label: 'Status', type: 'select' },
            { label: 'Assigned To', type: 'select' },
            { label: 'Third Party', type: 'select' },
            { label: 'Origin' },
            { label: 'Description', type: 'textarea' },
          ],
        },
        { heading: 'Messages', fields: [{ label: 'New message', type: 'textarea' }] },
      ]}
    />
  )
}
