import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play, Plus, RefreshCw, Save } from 'lucide-react'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { useCreateRecurring, useRecurring, useToggleRecurring } from '../expenseTabs.queries'
import type { RecurringRow } from '../expenseTabsParser'
import { controlCls } from '../expenseTable'
import { ExpenseTable, type ExpenseColumn } from './ExpenseTable'
import { Field, FormCard, FormProblem } from './expenseParts'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// expense/recurring.php: expense reports the backend is told to repeat on a schedule.
export function ExpenseRecurringPage() {
  const { data, isLoading, isError, error, refetch } = useRecurring()
  const create = useCreateRecurring()
  const toggle = useToggleRecurring()

  const [templateId, setTemplateId] = useState('')
  const [frequency, setFrequency] = useState<string | null>(null)
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [autoCreate, setAutoCreate] = useState('0')
  const [problem, setProblem] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!templateId) return setProblem('Choose the template expense report.')
    if (!dateStart) return setProblem('Enter the start date.')
    setProblem(null)
    try {
      await create.mutateAsync({ templateId, frequency: frequency ?? data?.frequencies.find((f) => f.selected)?.value ?? 'monthly', dateStart, dateEnd, autoCreate: autoCreate === '1' })
      setTemplateId('')
      setDateStart('')
      setDateEnd('')
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not create the recurring template.')
    }
  }

  const columns: ExpenseColumn<RecurringRow>[] = [
    { key: 'n', header: '#', sortValue: (r) => Number(r.n) || 0, cell: (r) => <span className="text-text-muted">{r.n}</span> },
    {
      key: 'ref',
      header: 'Template Ref',
      sortValue: (r) => r.ref,
      cell: (r) => (
        <Link to={ROUTES.expenseCard.replace(':id', r.templateId)} className="font-semibold text-brand hover:underline">
          {r.ref}
        </Link>
      ),
    },
    { key: 'frequency', header: 'Frequency', sortValue: (r) => r.frequency, cell: (r) => r.frequency },
    { key: 'start', header: 'Start', sortValue: (r) => r.start, cell: (r) => r.start },
    { key: 'end', header: 'End', sortValue: (r) => r.end, cell: (r) => r.end },
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
      header: 'Active',
      sortValue: (r) => r.active,
      cell: (r) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.active === 'Active' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>{r.active}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      cell: (r) =>
        r.toggle && (
          <button
            type="button"
            disabled={toggle.isPending}
            onClick={() => r.toggle && toggle.mutate({ rid: r.toggle.rid, active: r.toggle.active })}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${r.toggle.active === '0' ? 'border-warning-fg/50 text-warning-fg hover:bg-warning-bg' : 'border-success-fg/50 text-success-fg hover:bg-success-bg'}`}
          >
            {r.toggle.active === '0' ? <Pause size={12} /> : <Play size={12} />} {r.toggle.label}
          </button>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <RefreshCw size={20} className="text-brand" /> Recurring Expenses
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading recurring expenses…" />}
      {isError && <LegacyErrorCard title="Couldn't load the recurring expenses" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {toggle.isError && <FormProblem message={toggle.error instanceof Error ? toggle.error.message : 'Could not change the template.'} />}

      {data && (
        <>
          {data.canCreate && (
            <FormCard icon={<Plus size={15} />} title="Create Recurring Expense">
              <form onSubmit={submit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-6">
                <Field label="Template Expense Report" className="md:col-span-2">
                  <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`${controlCls} w-full`}>
                    {data.templates.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Frequency">
                  <select value={frequency ?? data.frequencies.find((f) => f.selected)?.value ?? ''} onChange={(e) => setFrequency(e.target.value)} className={`${controlCls} w-full`}>
                    {data.frequencies.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Start Date">
                  <div className="flex gap-2">
                    <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={`${controlCls} min-w-0 flex-1`} />
                    <button type="button" onClick={() => setDateStart(iso(new Date()))} className="h-9 shrink-0 rounded-md border border-input-border px-3 text-sm text-text hover:bg-surface-hover">
                      Now
                    </button>
                  </div>
                </Field>
                <Field label="End Date">
                  <div className="flex gap-2">
                    <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={`${controlCls} min-w-0 flex-1`} />
                    <button type="button" onClick={() => setDateEnd(iso(new Date()))} className="h-9 shrink-0 rounded-md border border-input-border px-3 text-sm text-text hover:bg-surface-hover">
                      Now
                    </button>
                  </div>
                </Field>
                <Field label="Auto Create">
                  <select value={autoCreate} onChange={(e) => setAutoCreate(e.target.value)} className={`${controlCls} w-full`}>
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </Field>
                <div className="flex items-center gap-3 md:col-span-6">
                  <button
                    type="submit"
                    disabled={create.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Save size={14} /> {create.isPending ? 'Creating…' : 'Create Recurring Expense'}
                  </button>
                  <FormProblem message={problem} />
                </div>
              </form>
            </FormCard>
          )}

          <ExpenseTable
            rows={data.rows}
            columns={columns}
            rowKey={(r) => `${r.n}-${r.templateId}`}
            searchPlaceholder="Search recurring..."
            searchText={(r) => [r.ref, r.frequency, r.start, r.end, r.nextRun, r.active].join(' ')}
            defaultSort={{ key: 'start', dir: 'desc' }}
            empty="No recurring expenses yet."
          />
        </>
      )}
    </div>
  )
}
