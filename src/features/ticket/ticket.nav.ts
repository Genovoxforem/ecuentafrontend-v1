import { Ticket } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// The classic "Ticket" left menu (llx_menu, mainmenu='ticket'): a "Ticket"
// heading — itself a link to the open-ticket list — over New Ticket / List /
// My Tickets / Statistics, then Intervention (the job cards list,
// fichinter/list.php). Every one of those rows has fk_menu=-1, so the backend
// menu carries no nesting to rebuild: buildNavSections uses this list as the
// section's tree (ALWAYS_PREFER_LOCAL_NAV_KEYS), as for Hotel/Payroll/ZRA.
export const nav: NavSection = {
  key: 'ticket',
  label: 'Ticket',
  icon: Ticket,
  items: [
    {
      label: 'Ticket',
      path: ROUTES.ticketList,
      items: [
        { label: 'New Ticket', path: ROUTES.ticketNew },
        { label: 'List', path: ROUTES.ticketList },
        { label: 'My Tickets', path: ROUTES.ticketMyAssigned },
        { label: 'Statistics', path: ROUTES.ticketStatistics },
      ],
    },
    { label: 'Intervention', path: ROUTES.ticketIntervention },
  ],
}
