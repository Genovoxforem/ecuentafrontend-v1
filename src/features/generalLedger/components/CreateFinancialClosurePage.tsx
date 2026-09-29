import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileCheck, Loader2, X } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useFinancialClosureForm,
  useSubmitFinancialClosure,
  type FinancialClosureAction,
  type FinancialClosureForm,
  type FinancialClosureMonth,
} from '../financialClosure.queries'
import { useClosureDocuments, useUploadClosureDocuments } from '../financialClosureDocuments.queries'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

const toIso = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}
const toUs = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}
const todayUs = () => {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
}

// Where each pending line's "Click to bind / journal" goes — the app's own page for it.
const PENDING_ROUTE: Record<string, string> = {
  'customer invoice binding': ROUTES.ledgerCustomerBindingIndex,
  'vendor invoice binding': ROUTES.ledgerVendorBindingIndex,
  'expence report binding': ROUTES.ledgerExpenseReportBindingIndex,
  'sales journal': ROUTES.ledgerSellJournal,
  'purchase journal': ROUTES.ledgerPurchaseJournal,
  'expence journal': ROUTES.ledgerExpenseJournal,
  'finance journal': ROUTES.ledgerFinanceJournal,
}

// A month can only be ticked once nothing is left to bind or journalize in it (the backend page
// refuses the tick with "There is some journal need to be journalized").
const pendingCount = (m: FinancialClosureMonth) => m.pending.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.count, 0), 0)

function PendingDialog({ month, onClose }: { month: FinancialClosureMonth; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-gray-950" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-text!">Month of {month.label}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {month.pending.length === 0 && <p className="text-sm text-text-faint italic">Nothing pending.</p>}
        {month.pending.map((group) => (
          <div key={group.title} className="mb-3 last:mb-0">
            <h4 className="mb-1.5 text-sm font-semibold text-text!">{group.title}</h4>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const to = PENDING_ROUTE[item.label.toLowerCase()]
                return (
                  <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-muted">
                      {item.label} <span className={item.count > 0 ? 'font-semibold text-danger' : 'text-text-faint'}>({item.count})</span>
                    </span>
                    {to && (
                      <Link to={to} onClick={onClose} className="text-brand hover:underline whitespace-nowrap">
                        {/journal/i.test(item.label) ? 'Click to journal' : 'Click to bind'}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const CONFIRM: Record<FinancialClosureAction, { title: string; message: (months: string) => string; confirmLabel: string }> = {
  validate: { title: 'Create the year-end closing?', message: (m) => (m ? `Record the year-end closing with ${m} ticked?` : 'No month is ticked. Record the year-end closing anyway?'), confirmLabel: 'Create' },
  update: { title: 'Update the year-end closing?', message: (m) => (m ? `Save the ticked months (${m}) and the note on this year-end closing?` : 'No month is ticked. Update the year-end closing anyway?'), confirmLabel: 'Update' },
  approve: { title: 'Approve the year-end closing?', message: () => 'Approve this year-end closing? All 12 months have to be ticked.', confirmLabel: 'Approve' },
}

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-center gap-1.5 border-b border-border px-4 py-2.5 last:border-0 md:grid-cols-[minmax(10rem,14rem)_1fr] md:gap-4">
      <span className={`text-sm font-medium ${required ? 'text-danger' : 'text-text'}`}>
        {label}
        {required && '*'}
      </span>
      <div className="max-w-2xl">{children}</div>
    </div>
  )
}

function ClosureForm({ form }: { form: FinancialClosureForm }) {
  const submit = useSubmitFinancialClosure()
  const confirm = useConfirm()
  const [months, setMonths] = useState<Set<string>>(() => new Set(form.months.filter((m) => m.checked).map((m) => m.value)))
  const [startDate, setStartDate] = useState(form.startDate)
  const [author, setAuthor] = useState(form.author)
  const [validator, setValidator] = useState(form.validator)
  const [note, setNote] = useState(form.note)
  const [result, setResult] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [detail, setDetail] = useState<FinancialClosureMonth | null>(null)

  const tick = (m: FinancialClosureMonth) => {
    setProblem(null)
    if (!months.has(m.value) && pendingCount(m) > 0) {
      setProblem(`${m.label}: there is something left to bind or journalize, so this month cannot be ticked yet.`)
      return
    }
    setMonths((s) => {
      const next = new Set(s)
      if (next.has(m.value)) next.delete(m.value)
      else next.add(m.value)
      return next
    })
  }

  const total = form.months.reduce((sum, m) => sum + Number(m.movements || 0), 0)

  const run = async (action: FinancialClosureAction) => {
    setResult(null)
    setProblem(null)
    if (action === 'validate' && (!startDate || !author || author === '-1' || !validator || validator === '-1')) {
      setProblem('Start date, user and validator are required.')
      return
    }
    const labels = form.months.filter((m) => months.has(m.value)).map((m) => m.label).join(', ')
    const c = CONFIRM[action]
    const ok = await confirm({
      title: c.title,
      message: c.message(labels),
      warningTitle: 'This writes to the accounting books.',
      warningMessage: 'The year-end closing is recorded on the backend.',
      variant: 'default',
      confirmLabel: c.confirmLabel,
    })
    if (!ok) return
    submit.mutate({ form, action, months: [...months], startDate, author, validator, note }, { onSuccess: (msg) => setResult(msg || 'Done.') })
  }

  return (
    <div className="space-y-4">
      {result && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{result}</div>}
      {(problem || submit.isError) && (
        <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {problem ?? (submit.error instanceof Error ? submit.error.message : 'The closing was not accepted.')}
        </div>
      )}

      <h3 className="text-lg font-medium text-text!">Select month and validate</h3>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {form.months.map((m) => (
                  <th key={m.value} className="px-3 py-2 text-left text-xs font-semibold text-text whitespace-nowrap">
                    {m.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-bold text-text">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                {form.months.map((m) => (
                  <td key={m.value} className="px-3 py-3">
                    <div className="whitespace-nowrap text-text">
                      {m.movements}
                      <button type="button" onClick={() => setDetail(m)} title="What is still pending in this month" className="ml-0.5 text-danger hover:underline">
                        ({m.unvalidated})
                      </button>
                    </div>
                    <input type="checkbox" checked={months.has(m.value)} onChange={() => tick(m)} aria-label={`Close ${m.label}`} className="mt-3" />
                  </td>
                ))}
                <td className="px-3 py-3 font-bold text-text">{total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <Row label="Start Date" required>
          <div className="flex gap-1.5">
            <input type="date" value={toIso(startDate)} onChange={(e) => setStartDate(toUs(e.target.value))} aria-label="Start date" className={inputCls} />
            <button type="button" onClick={() => setStartDate(todayUs())} className="rounded-md border border-input-border px-3 text-sm text-text-muted hover:bg-surface-hover shrink-0">
              Now
            </button>
          </div>
        </Row>
        <Row label="User" required>
          <select value={author} onChange={(e) => setAuthor(e.target.value)} aria-label="User" className={inputCls}>
            {form.authors.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Validator" required>
          <select value={validator} onChange={(e) => setValidator(e.target.value)} aria-label="Validator" className={inputCls}>
            {form.validators.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Note (Public)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            aria-label="Note (public)"
            className="w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
        </Row>
        {form.existing && (
          <>
            <Row label="Status">
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${/^approved$/i.test(form.existing.approval) ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>{form.existing.approval}</span>
            </Row>
            <Row label="Work Status">
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${/^completed$/i.test(form.existing.workStatus) ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>{form.existing.workStatus}</span>
            </Row>
          </>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        {form.actions.map((a) => (
          <button
            key={a.action}
            type="button"
            onClick={() => run(a.action)}
            disabled={submit.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {submit.isPending && submit.variables?.action === a.action ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} />} {a.label}
          </button>
        ))}
      </div>

      {detail && <PendingDialog month={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

// The "Document Uploads" tab: the files attached to the year's closing. Only a year that has a
// closing can take documents.
function DocumentsTab({ year, onGoToClosing }: { year: number; onGoToClosing: () => void }) {
  const { data, isLoading, isError, error, refetch } = useClosureDocuments(year, true)
  const upload = useUploadClosureDocuments(year)
  const [files, setFiles] = useState<File[]>([])
  const [inputKey, setInputKey] = useState(0)
  const [result, setResult] = useState<string | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading documents…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  if (!data.enabled) {
    return (
      <Card className="!h-auto text-sm text-text-muted">
        <p>Create Financial Year Ending to Upload Documents.</p>
        <button type="button" onClick={onGoToClosing} className="mt-2 text-brand hover:underline">
          Go to the financial closing of {year}
        </button>
      </Card>
    )
  }

  const send = () => {
    setResult(null)
    upload.mutate(files, {
      onSuccess: (msg) => {
        setResult(msg || `${files.length} file(s) uploaded.`)
        setFiles([])
        setInputKey((k) => k + 1)
      },
    })
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto !p-0 overflow-hidden">
        <Row label="Number of attached files/documents">{data.fileCount}</Row>
        <Row label="Total size of attached files/documents">{data.totalSize || '0 b.'}</Row>
      </Card>

      <Card className="!h-auto space-y-3">
        <h3 className="text-base font-semibold text-text!">Attach a new file/document</h3>
        {result && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{result}</div>}
        {upload.isError && (
          <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
            {upload.error instanceof Error ? upload.error.message : 'The upload failed.'}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            key={inputKey}
            type="file"
            multiple
            aria-label="Files to attach"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="max-w-full text-sm text-text file:mr-3 file:rounded-md file:border file:border-input-border file:bg-surface file:px-3 file:py-1.5 file:text-sm"
          />
          <button
            type="button"
            onClick={send}
            disabled={files.length === 0 || upload.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {upload.isPending && <Loader2 size={14} className="animate-spin" />} Upload
          </button>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <h3 className="border-b border-border px-4 py-3 text-base font-semibold text-text!">Attached files and documents</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs font-semibold text-text">
                <th className="px-4 py-2">Documents</th>
                <th className="px-4 py-2 text-right">Size</th>
                <th className="px-4 py-2 text-center">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.files.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 italic text-text-faint">
                    No documents uploaded
                  </td>
                </tr>
              )}
              {data.files.map((f) => (
                <tr key={f.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    {f.href ? (
                      <a href={f.href} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                        {f.name}
                      </a>
                    ) : (
                      f.name
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-muted whitespace-nowrap">{f.size}</td>
                  <td className="px-4 py-2.5 text-center text-text-muted whitespace-nowrap">{f.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <h3 className="border-b border-border px-4 py-3 text-base font-semibold text-text!">Linked files and documents</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs font-semibold text-text">
                <th className="px-4 py-2">Links</th>
                <th className="px-4 py-2 text-center">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.links.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-center text-text-faint">
                    No registered links
                  </td>
                </tr>
              )}
              {data.links.map((l) => (
                <tr key={l.label + l.date} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    {l.href ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                        {l.label}
                      </a>
                    ) : (
                      l.label
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-text-muted whitespace-nowrap">{l.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// accountancy/closure/financialvalidate.php — the real "Financial Closing" for the chosen year:
// tick the months, set the start date, user, validator and note, then use the button the page
// offers — Create Year Ending while the year has no closing, Update Year Ending / Approve once it
// has one (each is that page's own POST). The second tab holds the documents attached to it.
export function CreateFinancialClosurePage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [tab, setTab] = useState<'closing' | 'documents'>('closing')
  const { data, isLoading, isError, error, refetch } = useFinancialClosureForm(year)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileCheck size={20} className="text-brand" /> Financial Closing
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-md text-brand hover:bg-surface-hover" aria-label="Previous year">
            <ChevronLeft size={18} />
          </button>
          <span className="text-lg font-semibold text-text!">Year {year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-md text-brand hover:bg-surface-hover" aria-label="Next year">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="flex gap-1 border-b border-border" role="tablist">
        {(
          [
            ['closing', 'Financial Closing'],
            ['documents', 'Document Uploads'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'documents' ? (
        <DocumentsTab key={year} year={year} onGoToClosing={() => setTab('closing')} />
      ) : (
        <>
          {isLoading && <LegacyLoadingCard label="Loading financial closing…" />}
          {(isError || (!isLoading && !data)) && <LegacyErrorCard title="Couldn't load the financial closing" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
          {data && <ClosureForm key={`${year}:${data.existing?.id ?? 'new'}`} form={data} />}
        </>
      )}
    </div>
  )
}
