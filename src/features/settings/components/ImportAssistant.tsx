import { useState } from 'react'
import { FileInput, Plus, ChevronLeft } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// imports/index.php (list) and imports/import.php (wizard) — confirmed no
// JSON API by reading the wizard's PHP directly (same $step/$action
// full-page-reload pattern as Export Assistant). This exact dataset list
// (imports/import.php) already has a real HTML-scrape-based parser
// elsewhere in this app (importsHtmlParser.ts, used by the Customer/Vendor
// Import wizard) — not reused here, to stay consistent with the rest of
// this session's Admin/Setup sweep, where "no JSON API" means design-only
// everywhere, not "scrape it because a scraper already exists for this
// exact page." The rows below are the real dataset list, reproduced from
// the reference screenshot (which was fully legible, unlike Export's).
const IMPORTABLE_DATASETS = [
  { module: 'Users & Groups', dataset: 'Users (Employees Or Not) And Properties' },
  { module: 'Members', dataset: 'Members' },
  { module: 'Third Parties', dataset: 'Third-Parties And Their Properties' },
  { module: 'Third Parties', dataset: 'Third-Parties Additional Contacts/Addresses And Attributes' },
  { module: 'Third Parties', dataset: 'Third-Parties Bank Accounts' },
  { module: 'Third Parties', dataset: 'Third-Parties Sales Representatives (Assign Sales Representatives/Users To Companies)' },
  { module: 'Quotations', dataset: 'Quotations' },
  { module: 'Quotations', dataset: 'Proposal Line' },
  { module: 'Sales Orders', dataset: 'Sales Orders' },
  { module: 'Sales Orders', dataset: 'Order Details' },
  { module: 'Vendors', dataset: 'Purchase Orders' },
  { module: 'Vendors', dataset: 'PO Lines' },
  { module: 'Vendors', dataset: 'Supplier Invoice' },
  { module: 'Vendors', dataset: 'Supplier Invoice Lines' },
  { module: 'Projects Or Leads', dataset: 'Tasks Of Projects' },
  { module: 'Resources', dataset: 'Resources' },
  { module: 'Tags/Categories', dataset: 'Links Between Products/Services And Tags/Categories' },
  { module: 'Tags/Categories', dataset: 'Links Between Vendors And Tags/Categories' },
  { module: 'Tags/Categories', dataset: 'Links Between Customers/Prospects And Tags/Categories' },
  { module: 'Tags/Categories', dataset: 'Links Between Members And Tags/Categories' },
  { module: 'Tags/Categories', dataset: 'Links Between Contacts/Addresses And Tags/Categories' },
  { module: 'Tags/Categories', dataset: 'Links Between Projects And Tags/Categories' },
]

export function ImportAssistant() {
  const [step, setStep] = useState<'list' | 'new'>('list')

  if (step === 'new') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setStep('list')} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <ChevronLeft size={18} />
          </button>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <FileInput size={20} className="text-brand" /> Import
          </h2>
        </div>
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide">Step 1</p>
        <Card className="!h-auto !bg-info-bg border-info/30 text-info-fg text-sm">Choose dataset you want to import…</Card>
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_60px] px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Module/Application</span>
            <span>Importable Dataset</span>
            <span />
          </div>
          {IMPORTABLE_DATASETS.map((row) => (
            <div key={row.dataset} className="grid grid-cols-[1fr_1fr_60px] px-4 py-3 border-b border-border last:border-0 items-center">
              <span className="text-sm font-semibold text-text!">{row.module}</span>
              <span className="text-sm text-brand">{row.dataset}</span>
              <input type="radio" disabled title="No real API exists for this wizard" className="text-brand focus:ring-brand/30 justify-self-end" />
            </div>
          ))}
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileInput size={20} className="text-brand" /> Import
      </h2>
      <p className="text-sm text-text-muted">This module allows you to update existing data or add new objects into the database from a file without technical knowledge, using an assistant.</p>

      <div className="flex justify-end">
        <button type="button" onClick={() => setStep('new')} className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white hover:bg-brand-hover">
          <Plus size={16} />
        </button>
      </div>

      <Card className="!h-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2">Import Model</th>
              <th className="font-medium py-2">Dataset</th>
              <th className="font-medium py-2">Import</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3} className="py-4 text-text-faint italic">
                No real API exists to list saved import models here — this page has no JSON equivalent, only a classic Dolibarr admin wizard.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
