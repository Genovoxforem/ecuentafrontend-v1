import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileInput, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useAllImportDatasets, useImportFormatNames } from '../importAssistant.data'
import { SetupShell } from './SetupShell'

// Setup > Import (the classic imports/index.php and imports/import.php?step=1). Both lists come from imports/fapi (importAssistant.data.ts): the
// dataset table is the classic "Module/Application | Importable dataset" table, and a dataset opens step 2 in the import wizard the app already
// has (customers/ImportCustomersWizard, which takes the dataset in its URL).
export function ImportAssistant() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<'list' | 'new'>(searchParams.get('step') === 'new' ? 'new' : 'list')
  const datasets = useAllImportDatasets()
  const formats = useImportFormatNames(datasets.data?.[0]?.code)

  if (step === 'new') {
    return (
      <SetupShell
        icon={FileInput}
        title="Import"
        onBack={() => setStep('list')}
        description={
          <>
            <span className="mr-2 text-xs font-semibold text-text-faint uppercase tracking-wide">Step 1</span>Choose dataset you want to import…
          </>
        }
      >
        {datasets.isLoading && <LegacyLoadingCard label="Loading the importable datasets…" />}
        {datasets.isError && <LegacyErrorCard title="Couldn't load the importable datasets" message={datasets.error instanceof Error ? datasets.error.message : 'Unknown error.'} onRetry={() => void datasets.refetch()} />}
        {datasets.data && (
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="grid grid-cols-[1fr_2fr] px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
              <span>Module/Application</span>
              <span>Importable Dataset</span>
            </div>
            {datasets.data.map((d) => (
              <div key={d.code} className="grid grid-cols-[1fr_2fr] px-4 py-3 border-b border-border last:border-0 items-center">
                <span className="text-sm font-semibold text-text!">{d.module}</span>
                {d.permitted ? (
                  <Link to={`${ROUTES.importCustomers}?dataset=${encodeURIComponent(d.code)}&step=2`} className="text-sm text-brand hover:underline">
                    {d.label}
                  </Link>
                ) : (
                  <span className="text-sm text-text-faint" title="You do not have the right to import this dataset">
                    {d.label}
                  </span>
                )}
              </div>
            ))}
          </Card>
        )}
      </SetupShell>
    )
  }

  return (
    <SetupShell
      icon={FileInput}
      title="Import"
      description="This module allows you to update existing data or add new objects into the database from a file without technical knowledge, using an assistant."
      headerRight={
        <button type="button" onClick={() => setStep('new')} aria-label="New import" className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white hover:bg-brand-hover">
          <Plus size={16} />
        </button>
      }
    >
      <Card className="!h-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2">Available Formats</th>
            </tr>
          </thead>
          <tbody>
            {formats.isLoading && (
              <tr>
                <td className="py-3 text-text-faint italic">Loading…</td>
              </tr>
            )}
            {(formats.data ?? []).map((name) => (
              <tr key={name} className="border-b border-border last:border-0">
                <td className="py-2 text-text!">{name}</td>
              </tr>
            ))}
            {formats.isError && (
              <tr>
                <td className="py-3 text-danger">The formats could not be read.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </SetupShell>
  )
}
