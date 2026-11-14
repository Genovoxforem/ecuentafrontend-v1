import { WalletCards } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the Installment Sales left menu of newecuenta (mainmenu=installment): Dashboard, Installment Sales List, Create Installment Sale,
// Installment Plans (the plan templates, in Settings), Payments, Receipts, Reports, Settings.
export const nav: NavSection = {
  key: 'installment',
  label: 'Installment Sales',
  icon: WalletCards,
  items: [
    { label: 'Dashboard', path: ROUTES.installmentDashboard },
    { label: 'Installment Sales List', path: ROUTES.installmentList },
    { label: 'Create Installment Sale', path: ROUTES.installmentNew },
    { label: 'Installment Plans', path: `${ROUTES.installmentSettings}?tab=plans` },
    { label: 'Payments', path: ROUTES.installmentPayments },
    { label: 'Receipts', path: ROUTES.installmentReceipts },
    { label: 'Reports', path: ROUTES.installmentReports },
    { label: 'Settings', path: ROUTES.installmentSettings },
  ],
}
