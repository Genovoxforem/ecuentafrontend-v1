import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit3, History, Pause, Play, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { fetchRecurringHistory, useCreateRecurring, useRecurring, useRecurringAction, useRunRecurring } from '../expenseTabs.queries'
import type { RecurringRow } from '../expenseTabs.types'
import { controlCls } from '../expenseTable'
import { ExpenseTable, type ExpenseColumn } from './ExpenseTable'
import { Field, FormCard, FormProblem } from './expenseParts'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// expense/recurring.php: expense reports the backend is told to repeat on a schedule.
export function ExpenseRecurringPage() {
  const { data, isLoading, isError, error, refetch } = useRecurring()
  const create = useCreateRecurring()
  const rowAction = useRecurringAction()
  const runNow = useRunRecurring()
  const [history, setHistory] = useState<string | null>(null)
  const [editing, setEditing] = useState<RecurringRow | null>(null)
  const [amountText, setAmountText] = useState('')

  const [templateId, setTemplateId] = useState('')
  const [frequency, setFrequency] = useState<string | null>(null)
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [autoCreate, setAutoCreate] = useState('0')
  const [problem, setProblem] = useState<string | null>(null)

  function resetForm() {
    setEditing(null)
    setTemplateId('')
    setDateStart('')
    setDateEnd('')
    setAmountText('')
    setAutoCreate('0')
    setFrequency(null)
  }

  // The row's Edit button: the form loads the schedule (its template stays fixed), as the page's own script does.
  function startEdit(r: RecurringRow) {
    if (!r.edit) return
    setEditing(r)
    setTemplateId(r.edit.tpl)
    setFrequency(r.edit.freq)
    setAutoCreate(r.edit.auto === '1' ? '1' : '0')
    setAmountText(r.edit.amount)
    const [d, m, y] = r.start.split('/')
    setDateStart(y && m && d ? `${y}-${m}-${d}` : '')
    const [d2, m2, y2] = r.end.split('/')
    setDateEnd(y2 && m2 && d2 ? `${y2}-${m2}-${d2}` : '')
    setProblem(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing && !templateId) return setProblem('Choose the template expense report.')
    if (!dateStart) return setProblem('Enter the start date.')
    setProblem(null)
    try {
      await create.mutateAsync({ templateId, frequency: frequency ?? data?.frequencies.find((f) => f.selected)?.value ?? 'monthly', dateStart, dateEnd, autoCreate: autoCreate === '1', amount: amountText, rid: editing?.rid })
      resetForm()
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not create the recurring template.')
    }
  }

  const columns: ExpenseColumn<RecurringRow>[] = [
    { key: 'n', header: '#', sortValue: (r) => Number(r.n) || 0, cell: (r) => <span className="text-text-muted">{r.n}</span> },
    {
      key: 'ref',
      header: 'Template',
      sortValue: (r) => r.ref,
      cell: (r) => (
        <div>
          <Link to={ROUTES.expenseCard.replace(':id', r.templateId)} className="font-semibold text-brand hover:underline">
            {r.ref}
          </Link>
          {r.refNote && <div className="text-xs text-text-muted">{r.refNote}</div>}
        </div>
      ),
    },
    { key: 'type', header: 'Type', sortValue: (r) => r.type, cell: (r) => r.type },
    { key: 'party', header: 'Employee / Vendor', sortValue: (r) => r.party, cell: (r) => r.party },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (r) => parseFloat(r.amount.replace(/,/g, '')) || 0, cell: (r) => <span className="tabular-nums">{r.amount}</span> },
    { key: 'frequency', header: 'Frequency', sortValue: (r) => r.frequency, cell: (r) => r.frequency },
    { key: 'start', header: 'Start', sortValue: (r) => r.start.split('/').reverse().join(''), cell: (r) => r.start },
    { key: 'end', header: 'End', sortValue: (r) => r.end, cell: (r) => r.end },
    { key: 'last', header: 'Last Run', sortValue: (r) => r.lastRun, cell: (r) => r.lastRun },
    { key: 'next', header: 'Next Run', sortValue: (r) => r.nextRun, cell: (r) => r.nextRun },
    {
      key: 'auto',
      header: 'Auto Create',
      sortValue: (r) => r.autoCreate,
      cell: (r) => (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.autoCreate === 'Yes' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>{r.autoCreate}</span>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      sortValue: (r) => r.active,
      cell: (r) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.active === 'Active' ? 'bg-success-bg text-success-fg' : r.active === 'Paused' ? 'bg-warning-bg text-warning-fg' : 'bg-neutral-bg text-neutral-fg'}`}>{r.active}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      cell: (r) => (
        <div className="flex items-center justify-center gap-1">
          {r.edit && (
            <button type="button" title="Edit" aria-label={`Edit ${r.ref}`} onClick={() => startEdit(r)} className="rounded-md border border-brand p-1.5 text-brand hover:bg-brand/10">
              <Edit3 size={13} />
            </button>
          )}
          <button type="button" title="History" aria-label={`History of ${r.ref}`} onClick={() => setHistory(r.rid)} className="rounded-md border border-info-fg/50 p-1.5 text-info-fg hover:bg-info-bg">
            <History size={13} />
          </button>
          {r.canPause && (
            <button type="button" title="Pause" aria-label={`Pause ${r.ref}`} disabled={rowAction.isPending} onClick={() => rowAction.mutate({ action: 'pause_recurring', rid: r.rid })} className="rounded-md border border-warning-fg/50 p-1.5 text-warning-fg hover:bg-warning-bg disabled:opacity-60">
              <Pause size={13} />
            </button>
          )}
          {r.canResume && (
            <button type="button" title="Resume" aria-label={`Resume ${r.ref}`} disabled={rowAction.isPending} onClick={() => rowAction.mutate({ action: 'resume_recurring', rid: r.rid })} className="rounded-md border border-success-fg/50 p-1.5 text-success-fg hover:bg-success-bg disabled:opacity-60">
              <Play size={13} />
            </button>
          )}
          {r.canDelete && (
            <button
              type="button"
              title="Delete"
              aria-label={`Delete ${r.ref}`}
              disabled={rowAction.isPending}
              onClick={() => window.confirm('Delete this schedule?') && rowAction.mutate({ action: 'delete_recurring', rid: r.rid })}
              className="rounded-md border border-danger-fg/50 p-1.5 text-danger-fg hover:bg-danger-bg disabled:opacity-60"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 p-6 space-y-4">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <RefreshCw size={20} className="text-brand" /> Recurring Expenses
        </h2>
        {data?.canCreate && (
          <button
            type="button"
            disabled={runNow.isPending}
            onClick={() => runNow.mutate()}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-60"
          >
            <Play size={14} /> {runNow.isPending ? 'Running…' : 'Run recurring'}
          </button>
        )}
      </div>

      {isLoading && <LegacyLoadingCard label="Loading recurring expenses…" />}
      {isError && <LegacyErrorCard title="Couldn't load the recurring expenses" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {rowAction.isError && <FormProblem message={rowAction.error instanceof Error ? rowAction.error.message : 'Could not change the schedule.'} />}
      {runNow.isError && <FormProblem message={runNow.error instanceof Error ? runNow.error.message : 'The recurring run failed.'} />}

      {data && (
        <>
          {data.canCreate && (
            <FormCard icon={<Plus size={15} />} title={editing ? `Edit Schedule #${editing.rid}` : 'Create Recurring Expense'}>
              <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                <Field label="Template Expense Report" className="w-56 max-w-full">
                  <select value={templateId} disabled={Boolean(editing)} onChange={(e) => setTemplateId(e.target.value)} className={`${controlCls} w-full`}>
                    {data.templates.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Frequency" className="w-36">
                  <select value={frequency ?? data.frequencies.find((f) => f.selected)?.value ?? ''} onChange={(e) => setFrequency(e.target.value)} className={`${controlCls} w-full`}>
                    {data.frequencies.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Start Date" className="w-44">
                  <div className="flex gap-2">
                    <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={`${controlCls} min-w-0 flex-1`} />
                    <button type="button" onClick={() => setDateStart(iso(new Date()))} className="h-9 shrink-0 rounded-md border border-input-border px-3 text-sm text-text hover:bg-surface-hover">
                      Now
                    </button>
                  </div>
                </Field>
                <Field label="End Date" className="w-44">
                  <div className="flex gap-2">
                    <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={`${controlCls} min-w-0 flex-1`} />
                    <button type="button" onClick={() => setDateEnd(iso(new Date()))} className="h-9 shrink-0 rounded-md border border-input-border px-3 text-sm text-text hover:bg-surface-hover">
                      Now
                    </button>
                  </div>
                </Field>
                <Field label="Auto Create" className="w-28">
                  <select value={autoCreate} onChange={(e) => setAutoCreate(e.target.value)} className={`${controlCls} w-full`}>
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </Field>
                <Field label="Amount (opt.)" className="w-32">
                  <input type="number" step="0.01" min="0" value={amountText} onChange={(e) => setAmountText(e.target.value)} className={`${controlCls} w-full`} />
                </Field>
                {editing && (
                  <button type="button" onClick={resetForm} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input-border px-4 text-sm text-text hover:bg-surface-hover">
                    <X size={14} /> Cancel edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Save size={14} /> {create.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Recurring Expense'}
                </button>
                <FormProblem message={problem} />
              </form>
            </FormCard>
          )}

          <ExpenseTable
            rows={data.rows}
            columns={columns}
            rowKey={(r) => `${r.n}-${r.templateId}`}
            searchPlaceholder="Search recurring..."
            searchText={(r) => [r.ref, r.type, r.party, r.amount, r.frequency, r.start, r.end, r.lastRun, r.nextRun, r.active].join(' ')}
            defaultSort={{ key: 'start', dir: 'desc' }}
            empty="No recurring expenses yet."
          />
        </>
      )}
      {history && <RecurringHistoryDialog rid={history} onClose={() => setHistory(null)} />}
    </div>
  )
}

// The History dialog of a schedule: every run it made (recurring_history).
function RecurringHistoryDialog({ rid, onClose }: { rid: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['expenses', 'recurring-history', rid], queryFn: () => fetchRecurringHistory(rid), retry: false })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label={`Run History — Schedule #${rid}`} className="w-full max-w-3xl space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Run History — Schedule #{rid}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="py-2">Run Date</th>
              <th>Expense</th>
              <th>Result</th>
              <th>Error</th>
              <th>Logged</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr>
                <td colSpan={5} className="py-3 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {q.isError && (
              <tr>
                <td colSpan={5} className="py-3 text-center text-danger-fg">
                  {q.error instanceof Error ? q.error.message : 'Could not load the history.'}
                </td>
              </tr>
            )}
            {q.data && q.data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-center text-text-muted">
                  No runs recorded
                </td>
              </tr>
            )}
            {q.data?.map((run, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="py-2">{run.run_date}</td>
                <td>
                  {run.ref && run.expense_id ? (
                    <Link to={ROUTES.expenseCard.replace(':id', String(run.expense_id))} className="text-brand hover:underline">
                      {run.ref}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${run.result === 'success' ? 'bg-success-bg text-success-fg' : run.result === 'skipped' ? 'bg-neutral-bg text-neutral-fg' : 'bg-danger-bg text-danger-fg'}`}>{run.result}</span>
                </td>
                <td>{run.error ?? ''}</td>
                <td>{run.datec ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
