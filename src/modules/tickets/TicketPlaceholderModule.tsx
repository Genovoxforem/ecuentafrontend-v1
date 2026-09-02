import { useLocation } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { NotBuiltPage } from '../../shared/components/dashboard/NotBuiltPage'
import { TICKET_PLACEHOLDERS } from '../../features/tickets/ticketsPlaceholders'

export function TicketPlaceholderModule() {
  const { pathname } = useLocation()
  const entry = TICKET_PLACEHOLDERS.find((p) => p.path === pathname)
  if (!entry) return <NotBuiltPage icon={HelpCircle} title="Unknown Ticket page" description="No placeholder entry found for this route." />
  return <NotBuiltPage icon={entry.icon} title={entry.title} description={entry.description} />
}
