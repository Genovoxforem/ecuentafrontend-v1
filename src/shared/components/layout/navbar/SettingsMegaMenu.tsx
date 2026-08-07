import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  ShoppingBag,
  Box,
  Warehouse,
  BookOpen,
  Briefcase,
  Landmark,
  Wallet,
  Workflow,
  PiggyBank,
  Building2,
  UsersRound,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ROUTES } from '../../../../routes'

interface CategoryLink {
  label: string
  path?: string
}

interface Category {
  label: string
  icon: LucideIcon
  links: CategoryLink[]
}

// Ports the legacy Navbar gear icon's mega-menu — a grid of module
// categories each linking to its real dashboard/list pages. Categories with
// no built module yet (Products, Projects, Banking, Procurement, Budget,
// Fixed Asset, Members) list their legacy labels as inert text, same
// honesty convention as the rail Sidebar.
const CATEGORIES: Category[] = [
  {
    label: 'Sales',
    icon: ShoppingCart,
    links: [
      { label: 'Sales Dashboard', path: ROUTES.salesDashboard },
      { label: 'List Of Customers', path: ROUTES.customerList },
      { label: 'Sales Invoices', path: ROUTES.invoiceList },
      { label: 'List', path: ROUTES.orderList },
    ],
  },
  {
    label: 'Purchases',
    icon: ShoppingBag,
    links: [
      { label: 'Purchases Dashboard', path: ROUTES.purchasesDashboard },
      { label: 'List Of Vendors', path: ROUTES.vendorList },
      { label: 'List Of Purchase Orders', path: ROUTES.purchaseOrderList },
      { label: 'Vendor Quotation', path: ROUTES.supplierProposalList },
    ],
  },
  { label: 'Products', icon: Box, links: [] },
  {
    label: 'Warehouses',
    icon: Warehouse,
    links: [{ label: 'Warehouse Dashboard', path: ROUTES.warehouseDashboard }],
  },
  {
    label: 'General Ledger',
    icon: BookOpen,
    links: [
      { label: 'Ledger Dashboard', path: ROUTES.ledgerDashboard },
      { label: 'Ledger List', path: ROUTES.ledgerList },
      { label: 'New Transaction', path: ROUTES.ledgerCreate },
    ],
  },
  { label: 'Projects', icon: Briefcase, links: [] },
  { label: 'Banking', icon: Landmark, links: [] },
  {
    label: 'Payroll',
    icon: Wallet,
    links: [{ label: 'Payroll Dashboard', path: ROUTES.payrollDashboard }],
  },
  { label: 'Procurement', icon: Workflow, links: [] },
  { label: 'Budget', icon: PiggyBank, links: [] },
  { label: 'Fixed Asset', icon: Building2, links: [] },
  { label: 'Members', icon: UsersRound, links: [] },
  {
    label: 'Taxes & Compliance',
    icon: ShieldCheck,
    links: [{ label: 'ZRA Dashboard', path: ROUTES.zra }],
  },
  {
    label: 'Users & Roles',
    icon: Users,
    links: [
      { label: 'Users Dashboard', path: ROUTES.usersDashboard },
      { label: 'New User', path: ROUTES.userCreate },
    ],
  },
]

export function SettingsMegaMenu({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()

  function go(path?: string) {
    if (path) navigate(path)
    onClose()
  }

  return (
    <div className="absolute right-0 mt-1 w-[min(90vw,880px)] max-h-[calc(100vh-4rem)] overflow-y-auto soft-scrollbar bg-surface border border-border rounded-lg shadow-xl z-30 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-text">Settings</span>
        <button type="button" onClick={onClose} title="Close" className="p-1 rounded-md text-text-faint hover:bg-surface-alt">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATEGORIES.map(({ label, icon: Icon, links }) => (
          <div key={label} className="border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text">
              <Icon size={16} className="text-brand" />
              {label}
            </div>
            {links.length === 0 ? (
              <p className="text-xs italic text-text-faint">Nothing here yet.</p>
            ) : (
              <ul className="space-y-1">
                {links.map((link) => (
                  <li key={link.label}>
                    <button type="button" onClick={() => go(link.path)} className="text-xs text-text-muted hover:text-brand hover:underline text-left">
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
