import { useParams, Link } from 'react-router-dom'
import { FileBarChart, ChevronLeft } from 'lucide-react'
import { findReport } from '../reportsStructure'
import { PurchaseReportView } from './PurchaseReportView'
import { SalesInvoicesReportView } from './SalesInvoicesReportView'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'
import { ROUTES } from '../../../routes'

// Single generic entry point for every report in the real Reports Center
// (custom/reports/reportsindex.php) — see reportsStructure.ts for the full
// real category/report list read directly from that file. Only 2 of these
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

  return (
    <div className="space-y-3">
      <Link to={ROUTES.reports} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text">
        <ChevronLeft size={14} /> Reports Center
      </Link>
      <DisabledFormPage icon={FileBarChart} title={found.report.label} sourcePath={found.report.phpPath} sections={[]} />
      {found.report.note && <p className="text-xs text-info-fg -mt-2 px-1">{found.report.note}</p>}
    </div>
  )
}
