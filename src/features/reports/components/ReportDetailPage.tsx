import { useParams, Link, Navigate } from 'react-router-dom'
import { FileBarChart, ChevronLeft } from 'lucide-react'
import { findReport } from '../reportsStructure'
import { PurchaseReportView } from './PurchaseReportView'
import { SalesInvoicesReportView } from './SalesInvoicesReportView'
import { AgingByCustomerView, AgingByInvoiceView } from './CustomerAgingView'
import { MonthlyStatementReportView } from './MonthlyStatementReportView'
import { MonthlyCustomerReportView } from './MonthlyCustomerReportView'
import { TillReportView } from './TillReportView'
import { OverallReportView } from './OverallReportView'
import { EntitywiseDailyView } from './EntitywiseDailyView'
import {
  AgingDetailsClassicView,
  AgingSummaryClassicView,
  CommissionDetailView,
  CommissionView,
  CreditNoteAgingView,
  CustomerReportClassicView,
  DueCustomersView,
  ProposalListView,
  SalesOrderListClassicView,
} from './ReceivablesReportViews'
import { PayablesListView, PurchaseOrderListView, VendorBalanceView, VendorReportClassicView } from './PayablesReportViews'
import { ClassicReportView } from './ClassicReportRoute'
import { ReportScreenView } from './ReportScreenView'
import { ReportNotAvailable } from './ReportNotAvailable'
import { REPORT_SCREENS } from '../reportScreens'
import { ActivityLogView } from './ActivityLogView'
import { BankEntriesReportView, BankSummaryReportView } from './BankReportViews'
import { LoansReportView } from './LoansReportView'
import { TillSalesReportView, TillSessionsReportView } from './TillClassicViews'
import { AccountBalancePage } from '../../generalLedger/components/AccountBalancePage'
import { ReportingAreaPage } from '../../generalLedger/components/ReportingAreaPage'
import { hasInlinePage, InlineModulePage } from './InlineModulePages'
import { ROUTES } from '../../../routes'

// Single generic entry point for every report in the real Reports Center
// (custom/reports/reportsindex.php) — see reportsStructure.ts for the full
// real category/report list read directly from that file. Only 4 of these
// ~90 reports have a confirmed real, secured JSON API; those render their
// real view, everything else gets an inert page matching the real page's
// existence (title + real PHP path) without fabricating fields for pages
// this pass didn't investigate field-by-field.
export function ReportDetailPage() {
  const { category, report } = useParams<{ category: string; report: string }>()
  const found = category && report ? findReport(category, report) : undefined

  if (!found) {
    return (
      <div className="space-y-3">
        <Link to={ROUTES.reports} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text">
          <ChevronLeft size={14} /> Reports Center
        </Link>
        <p className="text-sm text-danger">Unknown report.</p>
      </div>
    )
  }

  if (found.report.real === 'purchase-invoices') return <PurchaseReportView />
  if (found.report.real === 'sales-invoices') return <SalesInvoicesReportView />
  // the Receivables pages read from the classic page (receivablesClassic.data.ts); the Payables aging below reads the aging API
  if (found.report.real === 'aging-summary-classic') return <AgingSummaryClassicView title={found.report.label} />
  if (found.report.real === 'aging-details-classic') return <AgingDetailsClassicView title={found.report.label} />
  if (found.report.real === 'customer-report-classic') return <CustomerReportClassicView />
  if (found.report.real === 'credit-note-aging') return <CreditNoteAgingView />
  if (found.report.real === 'proposal-list') return <ProposalListView />
  if (found.report.real === 'commission') return <CommissionView />
  if (found.report.real === 'commission-detail') return <CommissionDetailView />
  if (found.report.real === 'due-customers') return <DueCustomersView />
  // custom/reports/monthly_statement_ajax.php and monthly_customer_report_ajax.php (classic session JSON)
  if (found.report.real === 'monthly-statement') return <MonthlyStatementReportView />
  if (found.report.real === 'monthly-customer') return <MonthlyCustomerReportView />
  // compta/facture/listreport_ajax.php (the classic invoice list) and the classic sales order list
  if (found.report.real === 'till') return <TillReportView />
  if (found.report.real === 'overall-report') return <OverallReportView />
  if (found.report.real === 'entitywise-daily') return <EntitywiseDailyView />
  // accountancy/fapi/balance.php and the income / expense by year report: opened here, inside the Reports Center
  if (found.report.real === 'account-balance' || found.report.real === 'income-expense') {
    return (
      <div className="space-y-3">
        <Link to={ROUTES.reports} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text">
          <ChevronLeft size={14} /> Reports Center
        </Link>
        {found.report.real === 'account-balance' ? <AccountBalancePage /> : <ReportingAreaPage />}
      </div>
    )
  }
  if (found.report.real === 'sales-orders') return <SalesOrderListClassicView />
  // activity_log.php (#391), party_report.php (#390), vendor_aging.php (#388)
  if (found.report.real === 'activity-log') return <ActivityLogView title={found.report.label} />
  if (found.report.real === 'vendor-aging-invoices') return <AgingByInvoiceView title={found.report.label} party="Vendor" />
  if (found.report.real === 'vendor-aging-vendors') return <AgingByCustomerView title={found.report.label} party="Vendor" />
  // the Payables pages without an API, read from the classic page (payablesClassic.data.ts)
  if (found.report.real === 'purchase-orders') return <PurchaseOrderListView />
  if (found.report.real === 'vendor-report-classic') return <VendorReportClassicView />
  if (found.report.real === 'vendor-balance') return <VendorBalanceView />
  if (found.report.real === 'vendor-credit-notes') return <PayablesListView kind="creditNotes" title={found.report.label} />
  if (found.report.real === 'vendor-credit-note-aging') return <PayablesListView kind="creditNoteAging" title={found.report.label} />
  if (found.report.real === 'vendor-refund-history') return <PayablesListView kind="refundHistory" title={found.report.label} />
  // compta/bank/fapi/entries.php, loan/fapi/list.php; the takeposnew till pages are read from the classic page (classic session)
  if (found.report.real === 'bank-entries') return <BankEntriesReportView />
  if (found.report.real === 'bank-summary') return <BankSummaryReportView />
  if (found.report.real === 'loans-report') return <LoansReportView />
  if (found.report.real === 'till-sales') return <TillSalesReportView />
  if (found.report.real === 'till-sessions') return <TillSessionsReportView />
  // the pages read from the classic page (classicReports.data.ts)
  if (found.report.real?.startsWith('classic:')) return <ClassicReportView reportKey={found.report.real.slice('classic:'.length)} />
  // the same data as a page this app already has
  if (found.report.appRoute && hasInlinePage(found.report.appRoute)) {
    return (
      <div className="space-y-3">
        <Link to={ROUTES.reports} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text">
          <ChevronLeft size={14} /> Reports Center
        </Link>
        <InlineModulePage route={found.report.appRoute} />
      </div>
    )
  }
  if (found.report.appRoute) return <Navigate to={found.report.appRoute} replace />

  return (
    <div className="space-y-3">
      <Link to={ROUTES.reports} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text">
        <ChevronLeft size={14} /> Reports Center
      </Link>
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileBarChart size={20} className="text-brand" /> {found.report.label}
      </h2>
      {REPORT_SCREENS[found.report.slug] ? (
        <ReportScreenView title={found.report.label} phpPath={found.report.phpPath} screen={REPORT_SCREENS[found.report.slug]} note={found.report.note} />
      ) : (
        <ReportNotAvailable title={found.report.label} phpPath={found.report.phpPath} note={found.report.note} />
      )}
    </div>
  )
}
