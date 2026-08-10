import type { LucideIcon } from 'lucide-react'

export interface NavLeafItem {
  label: string
  path?: string
}

export interface NavGroupItem {
  label: string
  items: NavItem[]
}

export type NavItem = NavLeafItem | NavGroupItem

export interface NavSection {
  key: string
  label: string
  icon: LucideIcon
  items: NavItem[]
}
