import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, ShieldCheck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useRequestValidation, useValidateMovements } from '../validateMovements.queries'

// The backend's own "Validate movements" page (accountancy/closure/validate.php): the number of
// movements by month for the chosen year, and the action that validates them.
export function ValidateMovementsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading, isFetching, isError, error, refetch } = useValidateMovements(year)
  const validate = useRequestValidation(year)
  const confirm = useConfirm()
  const [notice, setNotice] = useState<string | null>(null)

  const run = async () => {
    setNotice(null)
    const ok = await confirm({
      title: 'Validate movements?',
      message: `Validate the accounting movements (year ${year} shown)?`,
      warningTitle: 'Validated movements can no longer be modified or deleted.',
      warningMessage: "The backend's link carries only the year, so it may validate movements outside the months shown here. This cannot be undone from the app.",
      variant: 'default',
      confirmLabel: 'Validate Movements',
    })
    if (!ok) return
    validate.mutate(undefined, {
      onSuccess: () => setNotice('Validation requested. The backend page gives no confirmation and does not show which movements are validated, so this screen cannot check the result.'),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ShieldCheck size={20} className="text-brand" /> Validate Movements
        </h2>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1 py-1">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text" aria-label="Previous year">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-text! px-1.5">Year {year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text" aria-label="Next year">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading movements…" />}
      {isError && <LegacyErrorCard title="Couldn't load the movements" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {notice && <div className="rounded-lg border border-info/40 bg-info-bg/50 px-4 py-3 text-sm text-info-fg">{notice}</div>}
      {validate.isError && (
        <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {validate.error instanceof Error ? validate.error.message : 'The request was refused.'}
        </div>
      )}

      {data && (
        <>
          {data.description && <Card className="!h-auto text-sm text-text">{data.description}</Card>}

          <h3 className="text-base font-medium text-text!">{data.heading || 'Select Month And Validate'}</h3>

          <Card className={`!h-auto !p-0 overflow-hidden transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {data.months.map((m) => (
                      <th key={m.label} className="px-3 py-2.5 text-center text-xs font-semibold text-text">
                        {m.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-text">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {data.months.map((m) => (
                      // A year with no movements has blank cells on the backend page; that is 0.
                      <td key={m.label} className={`px-3 py-4 text-center tabular-nums ${!m.count || m.count === '0' ? 'text-text-faint' : 'font-medium text-text!'}`}>
                        {m.count || '0'}
                      </td>
                    ))}
                    <td className="px-3 py-4 text-center font-bold tabular-nums text-text!">{data.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {data.canValidate && (
            <div>
              <button
                type="button"
                disabled={validate.isPending}
                onClick={run}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {validate.isPending && <Loader2 size={14} className="animate-spin" />} Validate Movements
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
