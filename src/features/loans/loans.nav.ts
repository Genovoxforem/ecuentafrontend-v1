import { CircleDollarSign } from 'lucide-react'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Loans" left menu (llx_menu, mainmenu=loans).
export const nav: NavSection = {
  key: 'loans',
  label: 'Loans',
  icon: CircleDollarSign,
  items: [
    { label: 'Loans', items: [{ label: 'All Loan' }, { label: 'Loan Calculator' }, { label: 'Loan Product' }] },
    { label: 'Repayment' },
    { label: 'Loan Type' },
    { label: 'Loan Customer', items: [{ label: 'Create Loan Customer' }] },
    { label: 'Create Invoice' },
  ],
}
