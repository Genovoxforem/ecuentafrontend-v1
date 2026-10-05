import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileOutput, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SetupShell } from './SetupShell'

// exports/index.php (list) and exports/export.php (wizard) — confirmed by
// reading export.php directly: every step is driven by plain $step/$action
// GET/POST params with a full page reload each time (selectfield,
// unselectfield, downfield/upfield, builddoc, add_export_model, etc.), zero
// json_encode/AJAX anywhere in the file. The exportable-dataset list itself
// is assembled at runtime from every installed module's own export_*.class.php
// driver, not a static array in this file, so — unlike the Import Assistant
// list below, which was fully legible in the reference screenshot — only the
// one row actually visible there ("Invoices") is reproduced here; the real
// list continues well beyond it.
const EXPORTABLE_DATASETS = [{ module: 'Invoices', dataset: 'Customer Invoices And Invoice Details' }]

export function ExportAssistant() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<'list' | 'new'>(searchParams.get('step') === 'new' ? 'new' : 'list')

  if (step === 'new') {
    return (
      <SetupShell
        icon={FileOutput}
        title="Export Settings"
        onBack={() => setStep('list')}
        description={
          <>
            <span className="mr-2 text-xs font-semibold text-text-faint uppercase tracking-wide">Step 1</span>Choose dataset you want to export…
          </>
        }
      >
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_60px] px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Module/Application</span>
            <span>Exportable Dataset</span>
            <span />
          </div>
          {EXPORTABLE_DATASETS.map((row) => (
            <div key={row.dataset} className="grid grid-cols-[1fr_1fr_60px] px-4 py-3 border-b border-border last:border-0 items-center">
              <span className="text-sm text-text-muted">{row.module}</span>
              <span className="text-sm text-brand">{row.dataset}</span>
              <input type="radio" disabled title="No real API exists for this wizard" className="text-brand focus:ring-brand/30 justify-self-end" />
            </div>
          ))}
          <p className="px-4 py-3 text-xs text-text-faint italic">
            The reference page's full dataset list is assembled at runtime from every installed module and continues well beyond this — only the row visible in the source screenshot is
            reproduced here.
          </p>
        </Card>
      </SetupShell>
    )
  }

  return (
    <SetupShell
      icon={FileOutput}
      title="Exports"
      description="These tools allow the export of personalized data using an assistant, to help you in the process without requiring technical knowledge."
      headerRight={
        <button type="button" onClick={() => setStep('new')} aria-label="New export" className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white hover:bg-brand-hover">
          <Plus size={16} />
        </button>
      }
    >
      <Card className="!h-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2">Export Model</th>
              <th className="font-medium py-2">Dataset</th>
              <th className="font-medium py-2">Export</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3} className="py-4 text-text-faint italic">
                No real API exists to list saved export models here — this page has no JSON equivalent, only a classic Dolibarr admin wizard.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </SetupShell>
  )
}
