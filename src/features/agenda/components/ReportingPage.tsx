import { BarChart3, ExternalLink, FileText } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'

// comm/action/rapport/index.php (read directly) is a small, filter-less
// page: one row per calendar month with an event count (SELECT count(*),
// date_format(a.datep,'%m/%Y') ... GROUP BY year, month) and a "Build PDF"
// action that runs CommActionRapport::write_file() server-side
// (core/modules/action/rapport.pdf.php) to generate the actual report file.
// No json_encode/application/json anywhere in that file — the count table
// and the PDF generation are both real, but neither has a JSON API this SPA
// can call, so this stays an honest link out rather than a faked table of
// numbers or a client-side PDF we can't actually produce.
const LEGACY_REPORTING_URL = '/comm/action/rapport/index.php'

export function ReportingPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Reporting
      </h2>

      <Card className="!h-auto">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
            <FileText size={16} />
          </span>
          <div className="space-y-2">
            <p className="text-sm text-text!">
              The Agenda report groups every logged event by calendar month and generates a PDF summary on the server. This backend has no JSON API for either the monthly counts or the PDF
              generation — both are server-rendered and server-generated, so they open in the legacy app rather than being rebuilt here with placeholder numbers.
            </p>
            <a
              href={stripBackendPrefix(LEGACY_REPORTING_URL)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
            >
              Open Reporting <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </Card>
    </div>
  )
}
