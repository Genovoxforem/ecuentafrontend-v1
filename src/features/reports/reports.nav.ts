import { FileText } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

export const nav: NavSection = {
  key: 'reports',
  label: 'Reports',
  icon: FileText,
  items: [{ label: 'All Reports', path: ROUTES.reports }],
}
