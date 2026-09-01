import type { ComponentType } from 'react'
import { FilePlus, Wrench } from 'lucide-react'
import { ROUTES } from '../../routes'

export interface TicketPlaceholder {
  path: string
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export const TICKET_PLACEHOLDERS: TicketPlaceholder[] = [
  { path: ROUTES.ticketNew, icon: FilePlus, title: 'New Ticket', description: 'Real page: ticket/card.php?action=create — classic form-POST, no JSON API.' },
  {
    path: ROUTES.ticketIntervention,
    icon: Wrench,
    title: 'Intervention',
    description: 'Real page: fichinter/list.php — a fully separate Dolibarr module (Fiche d\'intervention/job cards, 13 real records) linked from the Ticket menu, not part of Ticket itself. Not rebuilt in this pass.',
  },
]
