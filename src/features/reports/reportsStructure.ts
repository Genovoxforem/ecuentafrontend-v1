import { BarChart3, Users, Wallet, Package, Building2, CreditCard, Receipt, TrendingUp, PieChart, RefreshCw, Boxes, Calculator, Landmark, Percent, FileClock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from '../../routes'

// The real "Reports Center" structure (custom/reports/reportsindex.php) —
// 14 always-visible categories (2 more, Loan Reports / Class Reports, are
// conditional on real rights/config this instance doesn't have active) and
// every real report link inside them, read directly from that file's own
// markup (the "#rptN" sidebar tabs + their matching <tbody id="rptN"> report
// tables), not guessed. Only 2 of these ~90 reports have a confirmed real
// JSON API behind them (see the *.data.ts files of this folder) — every other entry links
// to a real, existing PHP page with no API, so it gets an inert design-only
// route instead of an external link. icon/color/description are this pass's
// own presentation choices (the real page has no per-category description
// text of its own to read) — labels, paths, and grouping are all real.
export interface ReportEntry {
  slug: string
  label: string
  phpPath: string
  real?:
    | 'purchase-invoices'
    | 'sales-invoices'
    | 'aging-summary-classic'
    | 'aging-details-classic'
    | 'customer-report-classic'
    | 'credit-note-aging'
    | 'proposal-list'
    | 'commission'
    | 'commission-detail'
    | 'due-customers'
    | 'monthly-statement'
    | 'monthly-customer'
    | 'till'
    | 'sales-orders'
    | 'activity-log'
    | 'vendor-aging-invoices'
    | 'vendor-aging-vendors'
    | 'purchase-orders'
    | 'vendor-report-classic'
    | 'vendor-balance'
    | 'vendor-credit-notes'
    | 'vendor-credit-note-aging'
    | 'vendor-refund-history'
    | 'bank-entries'
    | 'bank-summary'
    | 'loans-report'
    | 'till-sales'
    | 'till-sessions'
    | 'overall-report'
    | 'entitywise-daily'
    // shown inside the Reports Center (same data and API as the General Ledger pages, no redirect to them)
    | 'account-balance'
    | 'income-expense'
    // read from the classic page by classicReports.data.ts (the key names its entry in TABLE_REPORTS / STATEMENTS)
    | `classic:${string}`
  // The report is the same data as a page this app already has (same API): the entry opens that page.
  appRoute?: string
  note?: string
}

export interface ReportCategory {
  key: string
  label: string
  description: string
  icon: LucideIcon
  colorClass: string
  reports: ReportEntry[]
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    key: 'overall-statitics',
    label: 'Overall Statitics',
    description: 'Summary of overall business performance',
    icon: BarChart3,
    colorClass: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
    reports: [
      { slug: 'overall-analysis-report', label: 'Overall Analysis Report', phpPath: 'custom/reports/overall_report.php', real: 'overall-report' },
      // monthly_customer_report_ajax.php / monthly_statement_ajax.php: pure-JSON companions of the classic pages, classic session only (BUG-95).
      { slug: 'customer-report', label: 'Customer Report', phpPath: 'custom/reports/monthly_customer_report.php', real: 'monthly-customer' },
      { slug: 'monthly-statement-report', label: 'Monthly Statement Report', phpPath: 'custom/reports/monthly_statement_report.php', real: 'monthly-statement' },
      {
        slug: 'entitywise-daily-report',
        label: 'Entitywise Daily Report',
        phpPath: 'custom/reports/entitywise_daily_report.php',
        real: 'entitywise-daily',
      },
    ],
  },
  {
    key: 'receivables',
    label: 'Receivables',
    description: 'Customer and receivable reports',
    icon: Users,
    colorClass: 'bg-green-50 text-green-500 dark:bg-green-500/10 dark:text-green-400',
    reports: [
      { slug: 'sales-invoices', label: 'Sales Invoices', phpPath: 'compta/facture/listreport.php', real: 'sales-invoices' },
      { slug: 'sales-order-details', label: 'Sales Order Details', phpPath: 'commande/listreport.php?type=salesorder', real: 'sales-orders' },
      // Every Receivables entry below is read from its classic page (see receivablesClassic.data.ts, read on newecuenta 10-11 Nov 2026), except Sales Invoices and Till
      // Report (listreport_ajax.php, classicInvoices.data.ts) and Sales Payment (a document builder: no list to read).
      { slug: 'customer-reports', label: 'Customer Reports', phpPath: 'compta/resultat/customer_report.php?type=c', real: 'customer-report-classic' },
      { slug: 'unpaid-customer-list', label: 'Unpaid Customer List', phpPath: 'custom/customersowed/view/customers_owed_report.php', note: 'The classic link answers 404 on newecuenta and on 172.16.5.10: that page does not exist there.' },
      // Aging: the classic pages count differently from compta/resultat/fapi/aging.php (AN-187), so these two entries show the classic figures; the Payables aging keeps the API.
      { slug: 'aging-summary', label: 'Aging Summary', phpPath: 'compta/resultat/aging_summary.php', real: 'aging-summary-classic' },
      { slug: 'aging-details', label: 'Aging Details', phpPath: 'compta/resultat/aging_details.php', real: 'aging-details-classic' },
      { slug: 'credit-note-aging-report', label: 'Credit Note Aging Report', phpPath: 'compta/resultat/creditnote_agingreport.php', real: 'credit-note-aging' },
      { slug: 'proposal-list', label: 'Proposal List', phpPath: 'comm/propal/proposalreport.php', real: 'proposal-list' },
      { slug: 'combine-commission-report', label: 'Combine Commission Report', phpPath: 'compta/resultat/commissionreport.php', real: 'commission' },
      { slug: 'combine-commission-detailed-report', label: 'Combine Commission Detailed Report', phpPath: 'compta/resultat/commission_det_report.php', real: 'commission-detail' },
      { slug: 'till-report', label: 'Till Report', phpPath: 'compta/facture/tillreport.php', real: 'till' },
      { slug: 'due-customers', label: 'Due Customers', phpPath: 'compta/facture/customerduelist.php', real: 'due-customers' },
      { slug: 'sales-payment', label: 'Sales Payment', phpPath: 'compta/paiement/rapport.php?leftmenu=customers_bills_payment_report' },
    ],
  },
  {
    key: 'payables',
    label: 'Payables',
    description: 'Vendor and payable reports',
    icon: Wallet,
    colorClass: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400',
    reports: [
      { slug: 'purchase-invoices', label: 'Purchase Invoices', phpPath: 'compta/resultat/purchase_report.php', real: 'purchase-invoices' },
      // The Payables pages with no JSON API are read from the classic page (payablesClassic.data.ts, read on newecuenta 11 Nov 2026; the instance has no vendor, so no row has been seen).
      { slug: 'purchase-order-list', label: 'Purchase Order List', phpPath: 'fourn/commande/listreport.php', real: 'purchase-orders' },
      // The Vendor Report (vendor_report.php?type=f) is the classic third-party list of the period, filtered by period, tag and sales representative: it has its own page, like the Customer Reports.
      { slug: 'vendor-report', label: 'Vendor Report', phpPath: 'compta/resultat/vendor_report.php?type=f', real: 'vendor-report-classic' },
      { slug: 'vendor-balances', label: 'Vendor Balances', phpPath: 'compta/resultat/vendor_balance.php', real: 'vendor-balance' },
      // vendor_aging.php (#388), the payables mirror of the customer aging (names crossed the same way); no vendor invoices on newecuenta, rows not seen
      { slug: 'payables-aging-summary', label: 'Aging Summary', phpPath: 'compta/resultat/vendoraging_summary.php', real: 'vendor-aging-invoices' },
      { slug: 'payables-aging-details', label: 'Aging Details', phpPath: 'compta/resultat/vendoraging_details.php', real: 'vendor-aging-vendors' },
      { slug: 'vendor-credits-details', label: 'Vendor Credits Details', phpPath: 'compta/resultat/vendor_creditnote.php', real: 'vendor-credit-notes' },
      { slug: 'payables-credit-note-aging-report', label: 'Credit Note Aging Report', phpPath: 'compta/resultat/vendorcreditagereport.php', real: 'vendor-credit-note-aging' },
      { slug: 'payments-made', label: 'Payments Made', phpPath: 'fourn/facture/paiement.php', appRoute: ROUTES.vendorPaymentsList },
      { slug: 'payables-refund-history', label: 'Refund History', phpPath: 'compta/resultat/vendorrefund_history.php', real: 'vendor-refund-history' },
      // rapport.php (Reporting / Payments reports): the Purchases page of that name, on fourn/facture/fapi/payments_report.php
      { slug: 'purchase-payment', label: 'Purchase Payment', phpPath: 'fourn/facture/rapport.php?leftmenu=suppliers_bills_payment_report', appRoute: ROUTES.vendorPaymentsReport },
    ],
  },
  {
    key: 'product-service',
    label: 'Product/service',
    description: 'Product and service performance reports',
    icon: Package,
    colorClass: 'bg-purple-50 text-purple-500 dark:bg-purple-500/10 dark:text-purple-400',
    reports: [
      { slug: 'product-list', label: 'Product List', phpPath: 'product/listreport.php?type=0', real: 'classic:product-list' },
      { slug: 'profit-per-product', label: 'Profit Per Product', phpPath: 'compta/resultat/profitper_product.php' },
      { slug: 'best-selling-products', label: 'Best Selling Products', phpPath: 'compta/resultat/best_product.php', real: 'classic:best-products' },
      { slug: 'products-services-by-popularity', label: 'Products/Services by popularity', phpPath: 'custom/rawproduct/popularityreport.php', real: 'classic:popularity' },
      { slug: 'service-list', label: 'Service list', phpPath: 'product/listreportservices.php?type=1', real: 'classic:service-list' },
      { slug: 'profit-per-service', label: 'Profit per Service', phpPath: 'compta/resultat/profitper_service.php' },
      { slug: 'best-selling-services', label: 'Best selling services', phpPath: 'compta/resultat/best_service.php', real: 'classic:best-services' },
    ],
  },
  {
    key: 'multicompany-reports',
    label: 'Multicompany Reports',
    description: 'Reports across multiple companies',
    icon: Building2,
    colorClass: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
    reports: [{ slug: 'foreign-currency-revaluation', label: 'Foreign currency revaluation', phpPath: 'accountancy/bookkeeping/exchange_list.php', appRoute: ROUTES.ledgerForeignCurrencyRevaluation }],
  },
  {
    key: 'payments-received',
    label: 'Payments Received',
    description: 'Payment and collection reports',
    icon: CreditCard,
    colorClass: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
    reports: [
      { slug: 'payments-received', label: 'Payments Received', phpPath: 'compta/paiement/list.php', appRoute: ROUTES.paymentsList },
      { slug: 'credit-note-list', label: 'Credit Note List', phpPath: 'compta/resultat/creditnote_details.php' },
      { slug: 'received-refund-history', label: 'Refund History', phpPath: 'compta/resultat/refundhistory.php' },
    ],
  },
  {
    key: 'expenses',
    label: 'Expenses',
    description: 'Expense and cost reports',
    icon: Receipt,
    colorClass: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
    reports: [
      {
        slug: 'list-of-expense-reports',
        label: 'List of expense reports',
        phpPath: 'expensereport/expensereport.php',
        real: 'classic:expense-reports',
      },
      { slug: 'expenses-by-category', label: 'Expenses by Category', phpPath: 'compta/resultat/expensecategory.php' },
      { slug: 'expenses-by-employee', label: 'Expenses by Employee', phpPath: 'compta/resultat/expense_employee.php' },
    ],
  },
  {
    key: 'turnover-sale-purchase-invoices',
    label: 'Turnover -Sale/Purchase Invoices',
    description: 'Turnover and sales/purchase reports',
    icon: TrendingUp,
    colorClass: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400',
    reports: [
      // The first two entries of this category in the classic reportsindex.php (takeposnew pages, no JSON list: read from the classic page, see tillClassic.data.ts)
      { slug: 'till-sales-report', label: 'Till Sales Report', phpPath: 'takeposnew/till_sales_report.php', real: 'till-sales' },
      { slug: 'till-sessions-report', label: 'Till Sessions Report', phpPath: 'takeposnew/till_sessions_report.php', real: 'till-sessions' },
      // compta/stats/fapi/turnover.php, the General Ledger "Turnover invoiced" page; the entry names the basis the classic link carries (modecompta)
      { slug: 'turnover-invoices', label: 'Turnover Invoices', phpPath: 'compta/stats/index.php?modecompta=CREANCES-DETTES', appRoute: `${ROUTES.ledgerReportTurnover}?basis=CREANCES-DETTES` },
      { slug: 'invoiced-by-third-parties', label: 'Invoiced By Third Parties', phpPath: 'compta/stats/turnovertprepo.php?modecompta=CREANCES-DETTES', real: 'classic:turnover-third-parties' },
      { slug: 'invoiced-by-internal-user', label: 'Invoiced By Internal User', phpPath: 'compta/stats/cabyuser.php?modecompta=CREANCES-DETTES', real: 'classic:turnover-users' },
      { slug: 'by-product-and-service', label: 'By product and service', phpPath: 'compta/stats/cabyprodserv.php?modecompta=CREANCES-DETTES', real: 'classic:turnover-products' },
      { slug: 'turnover-invoiced-by-sale-tax-rate', label: 'Turnover invoiced by sale tax rate', phpPath: 'compta/stats/byratecountry.php?modecompta=CREANCES-DETTES', real: 'classic:turnover-tax-rate' },
      { slug: 'turnover-collected', label: 'Turnover collected', phpPath: 'compta/stats/index.php?modecompta=RECETTES-DEPENSES', appRoute: `${ROUTES.ledgerReportTurnover}?basis=RECETTES-DEPENSES` },
      { slug: 'purchase-turnover-invoiced', label: 'Purchase turnover invoiced', phpPath: 'compta/stats/supplier_turnover.php?modecompta=CREANCES-DETTES' },
      { slug: 'purchase-turnover-by-vendor', label: 'Purchase Turnover By vendor', phpPath: 'compta/stats/supplier_turnover_by_thirdparty.php?modecompta=CREANCES-DETTES' },
    ],
  },
  {
    key: 'business-overview',
    label: 'Business Overview',
    description: 'Financial overview reports',
    icon: PieChart,
    colorClass: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
    reports: [
      { slug: 'profit-and-loss', label: 'Profit and Loss', phpPath: 'compta/resultat/profitloss.php', real: 'classic:profit-loss' },
      { slug: 'cash-flow-statement', label: 'Cash Flow Statement', phpPath: 'compta/resultat/cashflow_report.php' },
      { slug: 'horizontal-balance-sheet', label: 'Horizontal Balance Sheet', phpPath: 'compta/resultat/balancesheet_horizontal.php', real: 'classic:balance-horizontal' },
      { slug: 'vertical-balance-sheet', label: 'Vertical Balance Sheet', phpPath: 'compta/resultat/balancesheet_vertical.php', real: 'classic:balance-vertical' },
      { slug: 'trial-balance', label: 'Trial Balance', phpPath: 'compta/resultat/trial_balance_v2.php' },
      { slug: 'income-statement', label: 'Income Statement', phpPath: 'compta/resultat/statementreport.php', real: 'classic:income-statement' },
      { slug: 'trading-account', label: 'Trading Account', phpPath: 'compta/resultat/trading_profitloss.php' },
      { slug: 'income-expenditure-statement', label: 'Income & expenditure statement', phpPath: 'compta/resultat/incomeexpense.php', real: 'classic:income-expenditure' },
    ],
  },
  {
    key: 'recurring-invoices',
    label: 'Recurring Invoices',
    description: 'Recurring invoice reports',
    icon: RefreshCw,
    colorClass: 'bg-green-50 text-green-500 dark:bg-green-500/10 dark:text-green-400',
    reports: [{ slug: 'recurring-invoice-details', label: 'Recurring Invoice Details', phpPath: 'compta/facture/invoicetemplate_list.php' }],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Stock and warehouse reports',
    icon: Boxes,
    colorClass: 'bg-purple-50 text-purple-500 dark:bg-purple-500/10 dark:text-purple-400',
    reports: [
      { slug: 'stock-movement', label: 'Stock Movement', phpPath: 'product/inventorysummary.php', real: 'classic:stock-movement' },
      { slug: 'warehouse-summary', label: 'Warehouse Summary', phpPath: 'product/stock/warehousesummaryreport.php', real: 'classic:warehouse-summary' },
      { slug: 'stock-at-date', label: 'Stock at date', phpPath: 'product/stock/stockatdate.php', real: 'classic:stock-at-date' },
      { slug: 'stocks-by-lot-serial', label: 'Stocks by lot/serial', phpPath: 'custom/reports/batchwisestock.php' },
      { slug: 'non-movement-stock', label: 'Non Movement Stock', phpPath: 'product/productnonmovement.php' },
      // In the classic Reports Center (reportsindex.php) and missing here until now; it reads the POS terminals' stock, no API for it is documented
      { slug: 'terminal-wise-stock', label: 'Terminal Wise Stock', phpPath: 'takeposnew/stock_movement_report.php', real: 'classic:terminal-stock' },
    ],
  },
  {
    key: 'accountant',
    label: 'Accountant',
    description: 'Bookkeeping and journal reports',
    icon: Calculator,
    colorClass: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
    reports: [
      // Opens the chart of accounts (the setup tree): it lists the same accounts but not the Short Label, Parentcategory, Group Of Account and Reconcilable columns of the classic list (master report)
      { slug: 'list-of-accounting-accounts', label: 'List of the accounting accounts', phpPath: 'accountancy/admin/accountreport.php', real: 'classic:chart-of-accounts' },
      // "Operations - View by accounting account (Ledger)": the ledger page (accountancy/fapi/list.php?action=by_account)
      { slug: 'general-ledger', label: 'General Ledger', phpPath: 'accountancy/bookkeeping/listbyaccountreport.php', real: 'classic:general-ledger' },
      { slug: 'account-balance', label: 'Account Balance', phpPath: 'accountancy/bookkeeping/balance.php', real: 'account-balance' },
      { slug: 'purchase-journal', label: 'Purchase Journal', phpPath: 'accountancy/bookkeeping/listreport.php', real: 'classic:journal-purchase' },
      { slug: 'sales-journal', label: 'Sales Journal', phpPath: 'accountancy/bookkeeping/saleslistreport.php', real: 'classic:journal-sales' },
      { slug: 'expenses-journal', label: 'Expenses Journal', phpPath: 'accountancy/bookkeeping/expenselistreport.php', real: 'classic:journal-expense' },
      { slug: 'finance-journal', label: 'Finance Journal', phpPath: 'accountancy/bookkeeping/financelistreport.php', real: 'classic:journal-finance' },
      { slug: 'income-expense', label: 'Income / Expense', phpPath: 'compta/resultat/index.php', real: 'income-expense' },
    ],
  },
  {
    key: 'bank-and-asset-management',
    label: 'Bank And Asset Management',
    description: 'Bank transaction and loan reports',
    icon: Landmark,
    colorClass: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
    reports: [
      // compta/bank/fapi/entries.php (bankReports.data.ts) and loan/fapi/list.php (loansReport.data.ts)
      { slug: 'account-transactions', label: 'Account Transactions', phpPath: 'compta/resultat/bankentries_list.php', real: 'bank-entries' },
      { slug: 'bank-summary', label: 'Bank Summary', phpPath: 'compta/bank/bankentries_list_rep.php', real: 'bank-summary' },
      // The classic page lists the withdrawal receipts (Ref | Date | Amount | Status); no endpoint lists the orders (summary.php only has latest_orders) - master report
      { slug: 'direct-debit-order-report', label: 'Direct debit order report', phpPath: 'compta/prelevement/bons.php' },
      { slug: 'loans-reports', label: 'Loans Reports', phpPath: 'loan/listreport.php', real: 'loans-report' },
    ],
  },
  {
    key: 'taxes',
    label: 'Taxes',
    description: 'Sales tax and social/fiscal tax reports',
    icon: Percent,
    colorClass: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400',
    reports: [
      { slug: 'tax-accounts', label: 'Tax Accounts', phpPath: 'admin/dictreport.php?id=10&from=accountancy' },
      // The tax reports are the Ledger > Special Expenses pages (compta/tva/fapi and compta/sociales/fapi): the entry opens that page
      { slug: 'special-payments-area', label: 'Area for all special payments', phpPath: 'compta/charges/specialreport.php', appRoute: ROUTES.ledgerSpecialPaymentsArea },
      { slug: 'social-fiscal-taxes-list', label: 'List - Social/fiscal taxes', phpPath: 'compta/sociales/list.php', appRoute: ROUTES.ledgerSocialFiscalTaxesList },
      { slug: 'social-fiscal-taxes-payments', label: 'Payments-Social/fiscal taxes', phpPath: 'compta/sociales/payments.php?mode=sconly', appRoute: ROUTES.ledgerSocialFiscalTaxPayments },
      { slug: 'sales-tax', label: 'Sales tax', phpPath: 'compta/tva/listreport.php', appRoute: ROUTES.ledgerSalesTaxList },
      { slug: 'tax-report-by-month', label: 'Tax Report By Month', phpPath: 'compta/tva/index.php', appRoute: ROUTES.ledgerVatReportByMonth },
      { slug: 'report-by-customer-sales-tax', label: 'Report by customer-Sales tax', phpPath: 'compta/tva/clients.php', appRoute: ROUTES.ledgerVatReportByCustomer },
      { slug: 'report-by-rate-sales-tax', label: 'Report by rate-Sales tax', phpPath: 'compta/tva/quadri_detail.php', appRoute: ROUTES.ledgerVatReportByRate },
    ],
  },
  {
    key: 'activity-log',
    label: 'User Log Report',
    description: 'User activity log',
    icon: FileClock,
    colorClass: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
    // activity_log.php (#391, admin only) replaces log_report.php; transaction_report.php is a byte-identical copy of it (10 Nov 2026 API doc)
    reports: [
      { slug: 'activity-log', label: 'Activity Log', phpPath: 'custom/reports/log_report.php', real: 'activity-log' },
      { slug: 'online-transaction-log', label: 'Online Transaction Log', phpPath: 'custom/reports/transaction_report.php', real: 'activity-log' },
    ],
  },
]

export function findReport(categoryKey: string, reportSlug: string): { category: ReportCategory; report: ReportEntry } | undefined {
  const category = REPORT_CATEGORIES.find((c) => c.key === categoryKey)
  const report = category?.reports.find((r) => r.slug === reportSlug)
  return category && report ? { category, report } : undefined
}

// The category and report names of a /reports/<category>/<report> address (for the breadcrumb and the page banner).
export function reportNamesForPath(pathname: string): { category: string; report: string } | null {
  const [, root, categoryKey, reportSlug] = pathname.split('/')
  if (root !== 'reports' || !categoryKey || !reportSlug) return null
  const found = findReport(categoryKey, reportSlug)
  return found ? { category: found.category.label, report: found.report.label } : null
}

export function reportPath(categoryKey: string, reportSlug: string): string {
  return `/reports/${categoryKey}/${reportSlug}`
}
