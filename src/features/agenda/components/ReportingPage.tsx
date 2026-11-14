import { BarChart3, FileText } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// The classic Agenda report (comm/action/rapport/index.php, read directly) is a small, filter-less page: one row per calendar month with an
// event count and a "Build PDF" action that runs CommActionRapport::write_file() server-side. Neither has a JSON API this SPA can call (no
// endpoint in comm/fapi), and the app never links to a backend .php page, so the page says so and keeps the action inert until one exists.

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
              generation — both are server-rendered and server-generated, so this page cannot show them yet and does not fake the numbers.
            </p>
            <button
              type="button"
              disabled
              title="No JSON API exists for the monthly event counts or the PDF"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white opacity-60 cursor-not-allowed"
            >
              Build PDF
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
