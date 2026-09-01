import { Ticket } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Ticket" left menu (llx_menu, mainmenu='ticket') —
// confirmed this session by querying the DB directly. "List" and "My
// Assigned Tickets" are genuinely real (ticket_list_ajax.php); "Statistics"
// is real too (ticket_stats_ajax.php). "New Ticket" and "Intervention"
// (a fully separate fichinter module linked from this menu) have no JSON
// API — honest placeholders.
export const nav: NavSection = {
  key: 'ticket',
  label: 'Ticket',
  icon: Ticket,
  items: [
    { label: 'New Ticket', path: ROUTES.ticketNew },
    { label: 'List', path: ROUTES.ticketList },
    { label: 'My Assigned Tickets', path: ROUTES.ticketMyAssigned },
    { label: 'Statistics', path: ROUTES.ticketStatistics },
    { label: 'Intervention', path: ROUTES.ticketIntervention },
  ],
}
