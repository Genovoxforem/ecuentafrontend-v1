import { FolderArchive, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const CHECKBOXES = ['Invoices', 'Supplier Invoices', 'Expense Reports', 'Donations', 'Payments Of Salaries', 'Social Contributions', 'Various Payments', 'Loans Payment']

// compta/accounting-files.php — a search form (date range + document-type
// checkboxes) that streams a real ZIP download on submit, no JSON. Table
// columns match the real page's own arrayfields.
export function ExportAccountingDocumentsPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FolderArchive size={20} className="text-brand" /> Export Accounting Documents
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">compta/accounting-files.php</code>. Its search returns a server-rendered results table and its download
          streams a real ZIP file — neither is JSON, so the form below is shown disabled and the table stays empty.
        </p>
      </Card>

      <Card className="!h-auto space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CHECKBOXES.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-text-muted">
              <input type="checkbox" disabled />
              {c}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-text-muted">
            From
            <input type="date" disabled className="text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-2 py-1.5 cursor-not-allowed" />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-text-muted">
            To
            <input type="date" disabled className="text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-2 py-1.5 cursor-not-allowed" />
          </label>
          <button type="button" disabled className="px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white opacity-50 cursor-not-allowed">
            Search
          </button>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {['Type', 'Date', 'Date Due', 'Ref', 'Documents', 'Paid', 'Total HT', 'Total TTC', 'Total VAT'].map((c) => (
                  <th key={c} className="font-medium px-3 py-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={9} className="px-3 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
