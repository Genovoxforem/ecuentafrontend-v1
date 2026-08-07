import { Ticket } from 'lucide-react'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Ticket" left menu (llx_menu, mainmenu=ticket) — a
// flat list in the source, no sub-grouping.
export const nav: NavSection = {
  key: 'ticket',
  label: 'Ticket',
  icon: Ticket,
  items: [
    { label: 'Ticket Area' },
    { label: 'New Ticket' },
    { label: 'Ticket List' },
    { label: 'My Assigned Tickets' },
    { label: 'Statistics' },
    { label: 'Intervention' },
  ],
}
