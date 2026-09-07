import type { LucideIcon } from 'lucide-react'

export interface NavLeafItem {
  label: string
  path?: string
}

// Some real backend menu nodes are simultaneously a clickable page AND the
// parent of their own sub-items (e.g. Agenda's "Events" node, which links
// to the bare calendar while also containing New Event/List/Calendar/
// Reporting/Tags-Categories) — a real, common Dolibarr menu shape, not an
// edge case to special-case around. `path` here lets that node act as both.
export interface NavGroupItem {
  label: string
  path?: string
  items: NavItem[]
}

export type NavItem = NavLeafItem | NavGroupItem

export interface NavSection {
  key: string
  label: string
  icon: LucideIcon
  items: NavItem[]
}
