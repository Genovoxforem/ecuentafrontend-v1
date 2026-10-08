import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { MONTHS, periodLabel } from '../payrollV2.api'
import { usePayRunAction, usePayRuns } from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, StatusBadge, TablePanel, Td, Th } from './PayrollV2Chrome'

const thisYear = new Date().getFullYear()

export function PayRunsList() {
  const runs = usePayRuns()
  const create = usePayRunAction()
  const navigate = useNavigate()
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(thisYear))
  const [payDate, setPayDate] = useState('')
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    create.mutate(
      { action: 'create', params: { period_month: month, period_year: year, pay_date: payDate } },
      {
        onSuccess: (data) => {
          if (data?.id) navigate(`${ROUTES.payrollV2PayRuns}/${data.id}`)
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create pay run.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      {runs.isError && <ErrorCard error={runs.error} onRetry={() => runs.refetch()} />}

      <PanelCard title="Create New Pay Run">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Month</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30">
              {MONTHS.slice(1).map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Year</span>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Pay Date</span>
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          <button type="submit" disabled={create.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            <Plus size={15} /> {create.isPending ? 'Creating…' : 'Create Pay Run'}
          </button>
          {error && <p className="w-full text-sm text-danger">{error}</p>}
        </form>
      </PanelCard>

      <TablePanel title="All Pay Runs">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Ref</Th>
              <Th>Period</Th>
              <Th>Pay Date</Th>
              <Th>Status</Th>
              <Th className="text-right">&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {runs.isLoading && <LoadingRows cols={5} />}
            {!runs.isLoading && (runs.data ?? []).length === 0 && <EmptyRow colSpan={5} label="No pay runs created yet." />}
            {(runs.data ?? []).map((run) => (
              <tr key={run.id} className="border-t border-border">
                <Td className="font-medium">{run.ref}</Td>
                <Td>{periodLabel(run.period_month, run.period_year)}</Td>
                <Td>{run.pay_date ?? '—'}</Td>
                <Td>
                  <StatusBadge status={run.status} />
                </Td>
                <Td className="text-right">
                  <Link to={`${ROUTES.payrollV2PayRuns}/${run.id}`} className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-hover">
                    Open
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </div>
  )
}
