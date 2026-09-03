import { CircleDollarSign } from 'lucide-react'
import type { NavSection } from '../navTypes'
import { ROUTES } from '../../routes'

// Mirrors the real app's "Loans" left menu (llx_menu, mainmenu=loans) —
// the real custom/loanmanagement/ Dolibarr plugin, distinct from the
// unrelated core "Loan" tracker under Banking. See loans.queries.ts's
// header comment for what's real vs. design-only per leaf.
export const nav: NavSection = {
  key: 'loans',
  label: 'Loans',
  icon: CircleDollarSign,
  items: [
    {
      label: 'Loans',
      items: [
        { label: 'All Loan', path: ROUTES.loanManagementList },
        { label: 'Loan Calculator', path: ROUTES.loanCalculator },
        { label: 'Loan Product', path: ROUTES.loanProducts },
      ],
    },
    { label: 'Repayment', path: ROUTES.loanRepayment },
    { label: 'Loan Type', path: ROUTES.loanType },
    // Real tree has only "Create Loan Customer" as a clickable descendant of
    // this group (see loans.queries.ts's header comment) — the group's own
    // url (loans_customer_list.php) is never itself a navigable leaf, same
    // convention as every other group header in this app (e.g. "Loans"
    // above). The real Loan Customer List page this app builds is still
    // reachable — from Create Loan Customer's Cancel button, and from its
    // own "New Loan Customer" button after creating one.
    { label: 'Loan Customer', items: [{ label: 'Create Loan Customer', path: ROUTES.loanCustomerCreate }] },
    // Real: this leaf's own backend target is compta/facture/invoice.php —
    // the exact same page the app's existing "Create Invoice" already
    // wires up, so this reuses that route rather than duplicating it.
    { label: 'Create Invoice', path: ROUTES.invoiceCreateQuick },
  ],
}
