import { BarChart3, Users, Wallet, Package, Building2, CreditCard, Receipt, TrendingUp, PieChart, RefreshCw, Boxes, Calculator, Landmark, Percent, FileClock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// The real "Reports Center" structure (custom/reports/reportsindex.php) —
// 14 always-visible categories (2 more, Loan Reports / Class Reports, are
// conditional on real rights/config this instance doesn't have active) and
// every real report link inside them, read directly from that file's own
// markup (the "#rptN" sidebar tabs + their matching <tbody id="rptN"> report
// tables), not guessed. Only 2 of these ~90 reports have a confirmed real
// JSON API behind them (see reports.queries.ts) — every other entry links
// to a real, existing PHP page with no API, so it gets an inert design-only
// route instead of an external link. icon/color/description are this pass's
// own presentation choices (the real page has no per-category description
// text of its own to read) — labels, paths, and grouping are all real.
export interface ReportEntry {
  slug: string
  label: string
  phpPath: string
  real?: 'purchase-invoices' | 'sales-invoices'
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
      { slug: 'overall-analysis-report', label: 'Overall Analysis Report', phpPath: 'custom/reports/overall_report.php' },
      {
        slug: 'customer-report',
        label: 'Customer Report',
        phpPath: 'custom/reports/monthly_customer_report.php',
        note: 'Real JSON API exists (monthly_customer_report_ajax.php) but has zero permission check — flagged, not wired in this pass.',
      },
      {
        slug: 'monthly-statement-report',
        label: 'Monthly Statement Report',
        phpPath: 'custom/reports/monthly_statement_report.php',
        note: 'Real JSON API exists (monthly_statement_ajax.php) but has zero permission check — flagged, not wired in this pass.',
      },
      {
        slug: 'entitywise-daily-report',
        label: 'Entitywise Daily Report',
        phpPath: 'custom/reports/entitywise_daily_report.php',
        note: 'Real JSON API exists (entitywise_daily_report_ajax.php) but has zero permission check — flagged, not wired in this pass.',
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
      { slug: 'sales-order-details', label: 'Sales Order Details', phpPath: 'commande/listreport.php?type=salesorder' },
      { slug: 'customer-reports', label: 'Customer Reports', phpPath: 'compta/resultat/customer_report.php?type=c' },
      { slug: 'unpaid-customer-list', label: 'Unpaid Customer List', phpPath: 'custom/customersowed/view/customers_owed_report.php' },
      { slug: 'aging-summary', label: 'Aging Summary', phpPath: 'compta/resultat/aging_summary.php' },
      { slug: 'aging-details', label: 'Aging Details', phpPath: 'compta/resultat/aging_details.php' },
      { slug: 'credit-note-aging-report', label: 'Credit Note Aging Report', phpPath: 'compta/resultat/creditnote_agingreport.php' },
      { slug: 'proposal-list', label: 'Proposal List', phpPath: 'comm/propal/proposalreport.php' },
      { slug: 'combine-commission-report', label: 'Combine Commission Report', phpPath: 'compta/resultat/commissionreport.php' },
      { slug: 'combine-commission-detailed-report', label: 'Combine Commission Detailed Report', phpPath: 'compta/resultat/commission_det_report.php' },
      { slug: 'till-report', label: 'Till Report', phpPath: 'compta/facture/tillreport.php' },
      { slug: 'due-customers', label: 'Due Customers', phpPath: 'compta/facture/customerduelist.php' },
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
      { slug: 'purchase-order-list', label: 'Purchase Order List', phpPath: 'fourn/commande/listreport.php' },
      { slug: 'vendor-report', label: 'Vendor Report', phpPath: 'compta/resultat/vendor_report.php?type=f' },
      { slug: 'vendor-balances', label: 'Vendor Balances', phpPath: 'compta/resultat/vendor_balance.php' },
      { slug: 'payables-aging-summary', label: 'Aging Summary', phpPath: 'compta/resultat/vendoraging_summary.php' },
      { slug: 'payables-aging-details', label: 'Aging Details', phpPath: 'compta/resultat/vendoraging_details.php' },
      { slug: 'vendor-credits-details', label: 'Vendor Credits Details', phpPath: 'compta/resultat/vendor_creditnote.php' },
      { slug: 'payables-credit-note-aging-report', label: 'Credit Note Aging Report', phpPath: 'compta/resultat/vendorcreditagereport.php' },
      { slug: 'payments-made', label: 'Payments Made', phpPath: 'fourn/facture/paiement.php' },
      { slug: 'payables-refund-history', label: 'Refund History', phpPath: 'compta/resultat/vendorrefund_history.php' },
      { slug: 'purchase-payment', label: 'Purchase Payment', phpPath: 'fourn/facture/rapport.php?leftmenu=suppliers_bills_payment_report' },
    ],
  },
  {
    key: 'product-service',
    label: 'Product/service',
    description: 'Product and service performance reports',
    icon: Package,
    colorClass: 'bg-purple-50 text-purple-500 dark:bg-purple-500/10 dark:text-purple-400',
    reports: [
      { slug: 'product-list', label: 'Product List', phpPath: 'product/listreport.php?type=0' },
      { slug: 'profit-per-product', label: 'Profit Per Product', phpPath: 'compta/resultat/profitper_product.php' },
      { slug: 'best-selling-products', label: 'Best Selling Products', phpPath: 'compta/resultat/best_product.php' },
      { slug: 'products-services-by-popularity', label: 'Products/Services by popularity', phpPath: 'custom/rawproduct/popularityreport.php' },
      { slug: 'service-list', label: 'Service list', phpPath: 'product/listreportservices.php?type=1' },
      { slug: 'profit-per-service', label: 'Profit per Service', phpPath: 'compta/resultat/profitper_service.php' },
      { slug: 'best-selling-services', label: 'Best selling services', phpPath: 'compta/resultat/best_service.php' },
    ],
  },
  {
    key: 'multicompany-reports',
    label: 'Multicompany Reports',
    description: 'Reports across multiple companies',
    icon: Building2,
    colorClass: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
    reports: [{ slug: 'foreign-currency-revaluation', label: 'Foreign currency revaluation', phpPath: 'accountancy/bookkeeping/exchange_list.php' }],
  },
  {
    key: 'payments-received',
    label: 'Payments Received',
    description: 'Payment and collection reports',
    icon: CreditCard,
    colorClass: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
    reports: [
      { slug: 'payments-received', label: 'Payments Received', phpPath: 'compta/paiement/list.php' },
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
        note: 'Real, secured JSON API exists (expensereport_ajax_list.php) but not wired in this pass.',
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
      { slug: 'turnover-invoices', label: 'Turnover Invoices', phpPath: 'compta/stats/index.php?modecompta=CREANCES-DETTES' },
      { slug: 'invoiced-by-third-parties', label: 'Invoiced By Third Parties', phpPath: 'compta/stats/turnovertprepo.php?modecompta=CREANCES-DETTES' },
      { slug: 'invoiced-by-internal-user', label: 'Invoiced By Internal User', phpPath: 'compta/stats/cabyuser.php?modecompta=CREANCES-DETTES' },
      { slug: 'by-product-and-service', label: 'By product and service', phpPath: 'compta/stats/cabyprodserv.php?modecompta=CREANCES-DETTES' },
      { slug: 'turnover-invoiced-by-sale-tax-rate', label: 'Turnover invoiced by sale tax rate', phpPath: 'compta/stats/byratecountry.php?modecompta=CREANCES-DETTES' },
      { slug: 'turnover-collected', label: 'Turnover collected', phpPath: 'compta/stats/index.php?modecompta=RECETTES-DEPENSES' },
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
      { slug: 'profit-and-loss', label: 'Profit and Loss', phpPath: 'compta/resultat/profitloss.php' },
      { slug: 'cash-flow-statement', label: 'Cash Flow Statement', phpPath: 'compta/resultat/cashflow_report.php' },
      { slug: 'horizontal-balance-sheet', label: 'Horizontal Balance Sheet', phpPath: 'compta/resultat/balancesheet_horizontal.php' },
      { slug: 'vertical-balance-sheet', label: 'Vertical Balance Sheet', phpPath: 'compta/resultat/balancesheet_vertical.php' },
      { slug: 'trial-balance', label: 'Trial Balance', phpPath: 'compta/resultat/trial_balancenew.php' },
      { slug: 'income-statement', label: 'Income Statement', phpPath: 'compta/resultat/statementreport.php' },
      { slug: 'trading-account', label: 'Trading Account', phpPath: 'compta/resultat/trading_profitloss.php' },
      { slug: 'income-expenditure-statement', label: 'Income & expenditure statement', phpPath: 'compta/resultat/incomeexpense.php' },
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
      { slug: 'stock-movement', label: 'Stock Movement', phpPath: 'product/inventorysummary.php' },
      { slug: 'warehouse-summary', label: 'Warehouse Summary', phpPath: 'product/stock/warehousesummaryreport.php' },
      { slug: 'stock-at-date', label: 'Stock at date', phpPath: 'product/stock/stockatdate.php' },
      { slug: 'stocks-by-lot-serial', label: 'Stocks by lot/serial', phpPath: 'custom/reports/batchwisestock.php' },
      { slug: 'non-movement-stock', label: 'Non Movement Stock', phpPath: 'product/productnonmovement.php' },
    ],
  },
  {
    key: 'accountant',
    label: 'Accountant',
    description: 'Bookkeeping and journal reports',
    icon: Calculator,
    colorClass: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
    reports: [
      { slug: 'list-of-accounting-accounts', label: 'List of the accounting accounts', phpPath: 'accountancy/admin/accountreport.php' },
      { slug: 'general-ledger', label: 'General Ledger', phpPath: 'accountancy/bookkeeping/listbyaccountreport.php' },
      { slug: 'account-balance', label: 'Account Balance', phpPath: 'accountancy/bookkeeping/balance.php' },
      { slug: 'purchase-journal', label: 'Purchase Journal', phpPath: 'accountancy/bookkeeping/listreport.php' },
      { slug: 'sales-journal', label: 'Sales Journal', phpPath: 'accountancy/bookkeeping/saleslistreport.php' },
      { slug: 'expenses-journal', label: 'Expenses Journal', phpPath: 'accountancy/bookkeeping/expenselistreport.php' },
      { slug: 'finance-journal', label: 'Finance Journal', phpPath: 'accountancy/bookkeeping/financelistreport.php' },
      { slug: 'income-expense', label: 'Income / Expense', phpPath: 'compta/resultat/index.php' },
    ],
  },
  {
    key: 'bank-and-asset-management',
    label: 'Bank And Asset Management',
    description: 'Bank transaction and loan reports',
    icon: Landmark,
    colorClass: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
    reports: [
      { slug: 'account-transactions', label: 'Account Transactions', phpPath: 'compta/resultat/bankentries_list.php' },
      { slug: 'bank-summary', label: 'Bank Summary', phpPath: 'compta/bank/bankentries_list_rep.php' },
      { slug: 'direct-debit-order-report', label: 'Direct debit order report', phpPath: 'compta/prelevement/bons.php' },
      { slug: 'loans-reports', label: 'Loans Reports', phpPath: 'loan/listreport.php' },
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
      { slug: 'special-payments-area', label: 'Area for all special payments', phpPath: 'compta/charges/specialreport.php' },
      { slug: 'social-fiscal-taxes-list', label: 'List - Social/fiscal taxes', phpPath: 'compta/sociales/list.php' },
      { slug: 'social-fiscal-taxes-payments', label: 'Payments-Social/fiscal taxes', phpPath: 'compta/sociales/payments.php?mode=sconly' },
      { slug: 'sales-tax', label: 'Sales tax', phpPath: 'compta/tva/listreport.php' },
      { slug: 'tax-report-by-month', label: 'Tax Report By Month', phpPath: 'compta/tva/index.php' },
      { slug: 'report-by-customer-sales-tax', label: 'Report by customer-Sales tax', phpPath: 'compta/tva/clients.php' },
      { slug: 'report-by-rate-sales-tax', label: 'Report by rate-Sales tax', phpPath: 'compta/tva/quadri_detail.php' },
    ],
  },
  {
    key: 'activity-log',
    label: 'User Log Report',
    description: 'User activity log',
    icon: FileClock,
    colorClass: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
    reports: [{ slug: 'activity-log', label: 'Activity Log', phpPath: 'custom/reports/log_report.php' }],
  },
]

export function findReport(categoryKey: string, reportSlug: string): { category: ReportCategory; report: ReportEntry } | undefined {
  const category = REPORT_CATEGORIES.find((c) => c.key === categoryKey)
  const report = category?.reports.find((r) => r.slug === reportSlug)
  return category && report ? { category, report } : undefined
}

export function reportPath(categoryKey: string, reportSlug: string): string {
  return `/reports/${categoryKey}/${reportSlug}`
}
