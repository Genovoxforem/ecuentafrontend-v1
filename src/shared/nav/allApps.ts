import {
  Archive,
  BookOpen,
  BookText,
  Boxes,
  Briefcase,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Download,
  Factory,
  FileSignature,
  Handshake,
  HandCoins,
  Inbox,
  Landmark,
  Layers,
  LayoutGrid,
  Link2,
  ListChecks,
  Package,
  PackageCheck,
  PiggyBank,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Truck,
  UserRound,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { ROUTES } from '../../routes'
import { reportPath } from '../../features/reports/reportsStructure'

// The legacy top bar's "Search anythings" box opens an "All Apps" panel
// (mainDashboard/menuoffcanvas.php, included on every page by main.inc.php):
// one heading per module, a tile per page under it, filtered by what is typed
// in the box. This is that panel's content — the sections and tile labels in
// the order the backend renders them for this install (its Landed Cost tiles
// only appear when LANDED_CONST_DATA is on, which it is not, so they are left
// out like there; its second, duplicate "Receptions" heading is dropped).
//
// Every tile points at the React page for the same screen. A tile whose page
// has no React version yet has no `to`: it is shown but cannot be opened —
// never a link to the backend page (see feedback-no-direct-php-links).
export interface AppTile {
  label: string
  to?: string
}

export interface AppSection {
  title: string
  icon: LucideIcon
  tiles: AppTile[]
}

export const ALL_APPS: AppSection[] = [
  {
    title: 'Sales',
    icon: ShoppingCart,
    tiles: [
      { label: 'Create Quick Sales', to: ROUTES.invoiceCreateQuick },
      { label: 'Create Detailed Invoice', to: ROUTES.invoiceCreate },
      { label: 'Invoices List', to: ROUTES.invoiceList },
      { label: 'Create Sales Order', to: ROUTES.orderCreate },
      { label: 'Sales Order List', to: ROUTES.orderList },
      { label: 'Customers invoices', to: ROUTES.invoiceList },
      { label: 'Create Prospects', to: ROUTES.prospectsCreate },
      { label: 'Prospects List', to: ROUTES.prospectList },
      { label: 'New Contract', to: ROUTES.contractCreate },
      { label: 'List of contracts', to: ROUTES.contractList },
      { label: 'Create Contact', to: ROUTES.contactCreate },
      { label: 'List of contacts /address', to: ROUTES.contactList },
      { label: 'Create Customer', to: ROUTES.customersCreate },
      { label: 'Customer Details', to: ROUTES.customerList },
      { label: 'Template invoice', to: ROUTES.invoiceTemplates },
      { label: 'Payments received from customers', to: ROUTES.paymentsList },
      { label: 'Create Proposal', to: ROUTES.quotationCreate },
      { label: 'Proposals', to: ROUTES.quotationList },
    ],
  },
  {
    title: 'Purchase',
    icon: ShoppingBag,
    tiles: [
      { label: 'Create Purchase Order', to: ROUTES.purchaseOrderCreate },
      { label: 'Purchase Order List', to: ROUTES.purchaseOrderList },
      { label: 'Create Purchase Invoice', to: ROUTES.vendorInvoiceCreateQuick },
      { label: 'Purchase Invoice List', to: ROUTES.vendorInvoiceList },
      { label: 'Create Vendor', to: ROUTES.vendorCreate },
      { label: 'Vendor List', to: ROUTES.vendorList },
      { label: 'List Invoices', to: ROUTES.vendorInvoiceList },
      { label: 'Aging Summary', to: reportPath('payables', 'payables-aging-summary') },
      { label: 'Aging Details', to: reportPath('payables', 'payables-aging-details') },
      { label: 'Credit Note Aging Report', to: reportPath('payables', 'payables-credit-note-aging-report') },
    ],
  },
  {
    title: 'Products',
    icon: Package,
    tiles: [
      { label: 'New product', to: ROUTES.productCreate },
      { label: 'Product List', to: ROUTES.productList },
      { label: 'Stocks and location (warehouse) of products', to: ROUTES.productStocks },
      { label: 'Stocks by lot/serial', to: ROUTES.productStocksByLot },
      { label: 'Lots/Serials', to: ROUTES.lotsSerials },
      { label: 'Variant attributes', to: ROUTES.variantAttributes },
      { label: 'Product Statistics', to: ROUTES.productStats },
      { label: 'Product Price', to: ROUTES.productPriceList },
      { label: 'tags/categories', to: ROUTES.productTags },
    ],
  },
  {
    title: 'Services',
    icon: Wrench,
    tiles: [
      { label: 'Services area', to: ROUTES.productArea },
      { label: 'New service', to: ROUTES.serviceCreate },
      { label: 'Service List', to: ROUTES.serviceList },
      { label: 'Service Statistics', to: ROUTES.serviceStats },
      { label: 'Tags/ Categories', to: ROUTES.productTags },
    ],
  },
  {
    title: 'Receptions',
    icon: PackageCheck,
    tiles: [
      { label: 'Receptions area', to: ROUTES.receptionsArea },
      { label: 'New reception', to: ROUTES.receptionCreate },
      { label: 'Reception List', to: ROUTES.receptionList },
      { label: 'Draft Reception', to: ROUTES.receptionDraft },
      { label: 'Validated Reception', to: ROUTES.receptionValidated },
      { label: 'Processed', to: ROUTES.receptionProcessed },
      { label: 'Statistics Reception', to: ROUTES.receptionStatistics },
    ],
  },
  {
    title: 'Warehouses',
    icon: Warehouse,
    tiles: [
      { label: 'Warehouse List', to: ROUTES.warehouseList },
      { label: 'New Warehouse', to: ROUTES.warehouseCreate },
      { label: 'Movements', to: ROUTES.stockMovementsList },
      { label: 'Mass stock transfer', to: ROUTES.massStockTransfer },
      { label: 'Replenishment', to: ROUTES.replenishment },
      { label: 'Stock Correction', to: ROUTES.stockCorrection },
      { label: 'Stock Transfer', to: ROUTES.stockTransfer },
    ],
  },
  {
    title: 'Inventory',
    icon: Boxes,
    tiles: [
      { label: 'New Inventory', to: ROUTES.inventoryCreate },
      { label: 'Inventory List', to: ROUTES.inventoryList },
      { label: 'Trip Details' },
      { label: 'Fleet Expense' },
    ],
  },
  {
    title: 'Shipments',
    icon: Truck,
    tiles: [
      { label: 'Shipments area', to: ROUTES.shipmentList },
      // The React shipments page is where a new shipment is started from (it searches the orders waiting to ship).
      { label: 'New shipment', to: ROUTES.shipmentList },
      { label: 'Shipment List', to: ROUTES.shipmentList },
      { label: 'Shipment Draft', to: ROUTES.shipmentDraft },
      { label: 'Validated', to: ROUTES.shipmentValidated },
      { label: 'Processed', to: ROUTES.shipmentProcessed },
      { label: 'Statistics', to: ROUTES.shipmentStatistics },
    ],
  },
  {
    title: 'Leads | Projects',
    icon: Briefcase,
    tiles: [
      { label: 'New', to: ROUTES.projectCreate },
      { label: 'List', to: ROUTES.projectList },
      { label: 'List open leads', to: ROUTES.projectOpenLeadsList },
      { label: 'List open projects', to: ROUTES.projectOpenProjectsList },
      { label: 'Statistics', to: ROUTES.projectStats },
    ],
  },
  {
    title: 'Tasks/activities',
    icon: ListChecks,
    tiles: [
      { label: 'New task', to: ROUTES.projectTaskCreate },
      { label: 'List', to: ROUTES.projectTaskList },
      { label: 'Statistics', to: ROUTES.projectTaskStats },
    ],
  },
  {
    title: 'Banks-Cash',
    icon: Landmark,
    tiles: [
      { label: 'Bank Accounts', to: ROUTES.bankingAccounts },
      { label: 'New Financial Account', to: ROUTES.bankingNewAccount },
      { label: 'Bank List', to: ROUTES.bankingList },
      { label: 'List Entries', to: ROUTES.bankingEntries },
      { label: 'List Entries/ Tag/category', to: ROUTES.bankingEntriesByCategory },
      { label: 'Internal Transfer', to: ROUTES.bankingInternalTransfer },
      { label: 'Tags/ categories', to: ROUTES.bankingCategories },
      { label: 'Tags/ Categories of Transactions', to: ROUTES.bankingTransactionTags },
    ],
  },
  {
    title: 'Stripe',
    icon: CreditCard,
    tiles: [
      { label: 'List of Stripe Transaction', to: ROUTES.bankingStripeTransactions },
      { label: 'List of Stripe PayOut', to: ROUTES.bankingStripePayouts },
    ],
  },
  {
    title: 'Direct Debit Orders',
    icon: Repeat,
    tiles: [
      { label: 'Direct Debit Payment orders area', to: ROUTES.bankingDirectDebitArea },
      { label: 'New Direct Debit order', to: ROUTES.bankingNewDirectDebit },
      { label: 'Direct Debit orders', to: ROUTES.bankingDirectDebitOrders },
      { label: 'Direct Debit order lines', to: ROUTES.bankingDirectDebitLines },
      { label: 'Account Rejects', to: ROUTES.bankingAccountRejects },
      { label: 'Statistics', to: ROUTES.bankingDirectDebitStats },
    ],
  },
  {
    title: 'Accounting Area',
    icon: BookOpen,
    tiles: [
      { label: 'Chart of accounts', to: ROUTES.ledgerChartOfAccounts },
      { label: 'Chart of individual accounts', to: ROUTES.ledgerChartOfIndividualAccounts },
      { label: 'Ledger', to: ROUTES.ledgerDashboard },
      { label: 'Journals', to: ROUTES.ledgerList },
      { label: 'Opening Balance', to: ROUTES.ledgerOpeningBalance },
      { label: 'Product accounts', to: ROUTES.ledgerProductAccounts },
      { label: 'Closure accounts', to: ROUTES.ledgerClosureAccounts },
      { label: 'Account balance', to: ROUTES.ledgerAccountBalance },
      { label: 'Miscellaneous payments', to: ROUTES.ledgerMiscPaymentsList },
      { label: 'Loans List', to: ROUTES.ledgerEmployeeLoansList },
      { label: 'Donation List', to: ROUTES.ledgerDonationsList },
      { label: 'Social/fiscal taxes', to: ROUTES.ledgerSocialFiscalTaxesList },
      { label: 'Payments-Social/fiscal taxes', to: ROUTES.ledgerSocialFiscalTaxPayments },
      { label: 'Sales tax', to: ROUTES.ledgerSalesTaxList },
      { label: 'New Miscellaneous payments', to: ROUTES.ledgerMiscPaymentCreate },
    ],
  },
  {
    title: 'Binding to accounts',
    icon: Link2,
    tiles: [
      { label: 'Customer invoice binding', to: ROUTES.ledgerCustomerBindingIndex },
      { label: 'Customers To Dispatch', to: ROUTES.ledgerCustomerBindingToDispatch },
      { label: 'Customers To Dispatched', to: ROUTES.ledgerCustomerBindingDispatched },
      { label: 'Vendor invoice binding', to: ROUTES.ledgerVendorBindingIndex },
      { label: 'Vendor To Dispatch', to: ROUTES.ledgerVendorBindingToDispatch },
      { label: 'Vendor Dispatched', to: ROUTES.ledgerVendorBindingDispatched },
      { label: 'Expense report binding', to: ROUTES.ledgerExpenseReportBindingIndex },
      { label: 'Expense To Dispatch', to: ROUTES.ledgerExpenseReportBindingToDispatch },
      { label: 'Expense Dispatched', to: ROUTES.ledgerExpenseReportBindingDispatched },
    ],
  },
  {
    title: 'Journals',
    icon: BookText,
    tiles: [
      { label: 'Finance Journal', to: ROUTES.ledgerFinanceJournal },
      { label: 'Expense Journal', to: ROUTES.ledgerExpenseJournal },
      { label: 'Sell Journal', to: ROUTES.ledgerSellJournal },
      { label: 'Purchase Journal', to: ROUTES.ledgerPurchaseJournal },
    ],
  },
  {
    title: 'Export Options',
    icon: Download,
    tiles: [
      { label: 'Annual closure', to: ROUTES.ledgerAnnualClosure },
      { label: 'Validate movements', to: ROUTES.ledgerValidateMovements },
      { label: 'Export accounting documents', to: ROUTES.ledgerExportAccountingDocuments },
      { label: 'Export Options', to: ROUTES.ledgerExportOptions },
      { label: 'Export source documents', to: ROUTES.ledgerExportAccountingDocuments },
    ],
  },
  {
    title: 'Groups',
    icon: Layers,
    tiles: [
      { label: 'By predefined groups', to: ROUTES.ledgerPredefinedGroups },
      { label: 'By personalized groups', to: ROUTES.ledgerPersonalizedGroupsReport },
    ],
  },
  {
    title: 'Sales Orders',
    icon: ClipboardList,
    tiles: [
      { label: 'Create Sales order', to: ROUTES.orderCreate },
      { label: 'List', to: ROUTES.orderList },
      { label: 'Statistics', to: ROUTES.orderStats },
    ],
  },
  {
    title: 'Purchase orders',
    icon: ClipboardList,
    tiles: [
      { label: 'Create Purchase order', to: ROUTES.purchaseOrderCreate },
      { label: 'List', to: ROUTES.purchaseOrderList },
      { label: 'Statistics', to: ROUTES.purchaseOrderStats },
    ],
  },
  {
    title: 'Contracts',
    icon: FileSignature,
    tiles: [
      { label: 'Create New Contract', to: ROUTES.contractCreate },
      { label: 'Contract List', to: ROUTES.contractList },
      { label: 'Services', to: ROUTES.contractServices },
      { label: 'Contract/services Status', to: ROUTES.contractReport },
    ],
  },
  {
    title: 'Commercial Proposals',
    icon: Handshake,
    tiles: [
      { label: 'New proposal', to: ROUTES.quotationCreate },
      { label: 'List', to: ROUTES.quotationList },
      { label: 'Statistics', to: ROUTES.quotationStats },
    ],
  },
  {
    title: 'Vendor proposals',
    icon: Handshake,
    tiles: [
      { label: 'Vendor proposals area', to: ROUTES.supplierProposalArea },
      { label: 'New price request', to: ROUTES.supplierProposalCreate },
      { label: 'Vendor Proposal List', to: ROUTES.supplierProposalList },
    ],
  },
  {
    title: 'Work Area',
    icon: LayoutGrid,
    tiles: [{ label: 'New Work Area' }, { label: 'Work Area' }],
  },
  {
    title: 'Production Order',
    icon: Factory,
    tiles: [{ label: 'Order List' }, { label: 'Production Order' }, { label: 'Customer Order' }, { label: 'Production Order CLOSE' }],
  },
  {
    title: 'Payroll',
    icon: Wallet,
    tiles: [
      { label: 'Attendance', to: ROUTES.payrollMarkAttendance },
      { label: 'Advance salary', to: ROUTES.payrollAdvanceSalary },
      { label: 'Loan', to: ROUTES.payrollEmployeeLoan },
      { label: 'Shifts', to: ROUTES.payrollAssignShifts },
      { label: 'Salary Template', to: ROUTES.payrollSalaryTemplate },
      { label: 'Hourly Template', to: ROUTES.payrollHourlyTemplate },
      { label: 'Manage Salary', to: ROUTES.payrollManageSalary },
      { label: 'Manage Salary List', to: ROUTES.payrollManageSalaryList },
      { label: 'Make Payment', to: ROUTES.payrollGenerateMakePayment },
    ],
  },
  {
    title: 'Core HR',
    icon: Users,
    tiles: [
      { label: 'Employee Award', to: ROUTES.payrollEmployeeAward },
      { label: 'Transfers', to: ROUTES.payrollEmployeeTransfers },
      // The legacy tile opens the new-resignation form (resignations.php?action=create).
      { label: 'Resignation', to: ROUTES.payrollEmployeeResignationCreate },
      { label: 'Travel', to: ROUTES.payrollEmployeeTravel },
      { label: 'Complaints', to: ROUTES.payrollEmployeeComplaints },
      { label: 'Warnings', to: ROUTES.payrollEmployeeWarnings },
      { label: 'Terminations', to: ROUTES.payrollEmployeeTerminations },
      { label: 'Calendar Holidays', to: ROUTES.payrollCalendarHolidays },
      { label: 'Indicator', to: ROUTES.payrollEmployeeIndicator },
      { label: 'Appraisal', to: ROUTES.payrollEmployeeAppraisal },
      { label: 'Monthly Allowance And Deduction', to: ROUTES.payrollMonthlyAllowanceDeduction },
    ],
  },
  {
    title: 'Users/Groups',
    icon: Users,
    tiles: [
      { label: 'New User', to: ROUTES.userCreate },
      { label: 'User List', to: ROUTES.usersDashboard },
      { label: 'New Group', to: ROUTES.userGroupCreate },
      { label: 'Group List', to: ROUTES.userGroupList },
      { label: 'Activities list', to: ROUTES.activitiesDetail },
    ],
  },
  {
    title: 'HRM',
    icon: CalendarDays,
    tiles: [
      { label: 'Leave request', to: ROUTES.leaveRequest },
      { label: 'List Leave', to: ROUTES.leaveList },
      { label: 'New Expenses reports', to: ROUTES.expensesCreate },
      { label: 'List Expenses reports', to: ROUTES.expenseReportsList },
      { label: 'Monthly statement' },
    ],
  },
  {
    title: 'Agenda',
    icon: CalendarDays,
    tiles: [
      { label: 'Events', to: ROUTES.agenda },
      { label: 'Events List', to: `${ROUTES.agenda}?view=list` },
      { label: 'Calendar', to: ROUTES.agenda },
      { label: 'Reporting', to: ROUTES.agendaReporting },
    ],
  },
  {
    title: 'Check Deposits',
    icon: PiggyBank,
    tiles: [
      { label: 'Check Deposits Area', to: ROUTES.bankingCheckDepositsArea },
      { label: 'New Deposit', to: ROUTES.bankingNewDeposit },
      { label: 'Deposit List', to: ROUTES.bankingDepositList },
    ],
  },
  {
    title: 'Loans',
    icon: HandCoins,
    tiles: [
      { label: 'New loans', to: ROUTES.bankingNewLoan },
      { label: 'Loan List', to: ROUTES.bankingLoanList },
    ],
  },
  {
    title: 'Production',
    icon: Factory,
    tiles: [
      { label: 'MRP' },
      { label: 'New bill of material' },
      { label: 'Production List' },
      { label: 'Manufacturing Order' },
      { label: 'New Manufacturing Order' },
      { label: 'List Manufacturing order' },
    ],
  },
  {
    title: 'Request',
    icon: Inbox,
    tiles: [{ label: 'Request New' }, { label: 'Request List' }, { label: 'Head Approval' }, { label: 'Update Items' }, { label: 'Budget Approval' }],
  },
  {
    title: 'Assets',
    icon: Archive,
    tiles: [
      { label: 'Assets Details', to: ROUTES.fixedAssetList },
      { label: 'Assets types', to: ROUTES.fixedAssetTypes },
      { label: 'Asset Category', to: ROUTES.fixedAssetCategory },
      { label: 'Asset Group', to: ROUTES.fixedAssetGroup },
    ],
  },
  {
    title: 'Assets Insurance',
    icon: ShieldCheck,
    tiles: [{ label: 'Insurance Company', to: ROUTES.fixedAssetInsuranceCompany }],
  },
  {
    title: 'Assets Journal',
    icon: BookText,
    tiles: [{ label: 'List of Asset Transaction Report', to: ROUTES.fixedAssetTransactionReport }],
  },
  {
    title: 'Members',
    icon: UserRound,
    tiles: [
      { label: 'New member', to: ROUTES.memberNew },
      { label: 'List', to: ROUTES.memberList },
      // The legacy status shortcuts open its member list pre-filtered; the React list shows every
      // member with its status, so they all land there.
      { label: 'Draft members', to: ROUTES.memberList },
      { label: 'Validated members', to: ROUTES.memberList },
      { label: 'Members Up To Date', to: ROUTES.memberList },
      { label: 'Members Not Up To Date', to: ROUTES.memberList },
      { label: 'Terminated members', to: ROUTES.memberList },
      { label: 'Statistics', to: ROUTES.memberStatistics },
      { label: 'Members business cards' },
    ],
  },
  {
    title: 'Subscriptions',
    icon: CreditCard,
    tiles: [
      { label: 'New subscription', to: ROUTES.memberList },
      { label: 'List', to: ROUTES.memberSubscriptions },
      { label: 'Statistics', to: ROUTES.memberStatistics },
    ],
  },
  {
    title: 'Tags/Categories',
    icon: Tag,
    tiles: [{ label: 'New tag/category' }],
  },
  {
    title: 'Members Type',
    icon: Users,
    tiles: [
      { label: 'New', to: ROUTES.memberTypes },
      { label: 'List', to: ROUTES.memberTypes },
    ],
  },
]

// The legacy panel's filter, made a little friendlier: it hides every heading and tile whose
// text does not contain what was typed (case-insensitive). There, a heading that matched only by
// its own title stayed visible but lost all of its tiles (typing "payroll" showed an empty Payroll
// heading); here a matching heading keeps all its tiles. A heading with no matching tile and no
// matching title is hidden, like there.
export function filterAllApps(sections: AppSection[], query: string): AppSection[] {
  const q = query.trim().toLowerCase()
  if (!q) return sections
  const out: AppSection[] = []
  for (const section of sections) {
    if (section.title.toLowerCase().includes(q)) {
      out.push(section)
      continue
    }
    const tiles = section.tiles.filter((t) => t.label.toLowerCase().includes(q))
    if (tiles.length > 0) out.push({ ...section, tiles })
  }
  return out
}
