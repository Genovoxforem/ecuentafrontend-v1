import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCheck, PlusCircle, Plus, Save, Send, Search, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAuth } from '../../auth/AuthContext'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useEntitySearch, useExpenseTypes, useCreateExpenseDraft, useSaveExpenseLines, useSubmitExpenseForValidation, type EntityOption, type ExpenseDraftLine } from '../expenses.queries'
import { useExpenseCreateForm } from '../expensePages.queries'
import { ROUTES } from '../../../routes'

const inputCls = 'h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const smallCls = 'h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const labelCls = 'block text-xs font-medium text-text-muted mb-1'

// The values are what the backend stores in expense_type ("employee", not "user").
type ExpenseTypeTab = 'internal' | 'employee' | 'customer' | 'vendor'
const TYPE_TABS: { value: ExpenseTypeTab; label: string }[] = [
  { value: 'internal', label: 'Internal' },
  { value: 'employee', label: 'Employee' },
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
]

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

interface DraftLine extends ExpenseDraftLine {
  key: string
  typeLabel: string
  productLabel: string
}

function NowButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-10 shrink-0 rounded-lg border border-input-border px-3 text-sm text-text hover:bg-surface-hover">
      Now
    </button>
  )
}

function EntityPicker({ label, value, onChange, type }: { label: string; value: EntityOption | null; onChange: (v: EntityOption | null) => void; type: 'user' | 'customer' }) {
  const [query, setQuery] = useState('')
  const { data: options } = useEntitySearch(type, query, query.length > 0)
  return (
    <div className="relative">
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          value={value ? value.text : query}
          onChange={(e) => {
            onChange(null)
            setQuery(e.target.value)
          }}
          placeholder={`Search ${label.toLowerCase()}…`}
          className={`${inputCls} w-full pl-7`}
        />
      </div>
      {!value && query && options && options.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o)
                setQuery('')
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-text hover:bg-surface-hover"
            >
              {o.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// expense/create.php: header (period, who it is for, expense type, notes), the item table, the approver
// and project, then Save Draft (createDraft + saveCachedLines) or Sent For Approval (+ submitForValidation).
// Every dropdown offers what the backend's own form offers.
export function NewExpenseForm() {
  const { user } = useAuth()
  const { data: form, isLoading, isError, error, refetch } = useExpenseCreateForm()
  const { data: expenseTypes } = useExpenseTypes()

  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [authorPick, setAuthorPick] = useState<string | null>(null)
  const [expenseType, setExpenseType] = useState<ExpenseTypeTab>('internal')
  const [linkedEntity, setLinkedEntity] = useState<EntityOption | null>(null)
  const [vendorId, setVendorId] = useState('-1')
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [validatorId, setValidatorId] = useState('-1')
  const [projectId, setProjectId] = useState('0')

  const [lineDate, setLineDate] = useState(() => iso(new Date()))
  const [lineType, setLineType] = useState('')
  const [lineQty, setLineQty] = useState('1')
  const [vatPick, setVatPick] = useState<string | null>(null)
  const [lineUnit, setLineUnit] = useState('')
  const [details, setDetails] = useState(false)
  const [lineProduct, setLineProduct] = useState('0')
  const [lineComment, setLineComment] = useState('')
  const [lineProject, setLineProject] = useState('0')
  const [lines, setLines] = useState<DraftLine[]>([])

  const createDraft = useCreateExpenseDraft()
  const saveLines = useSaveExpenseLines()
  const submitForValidation = useSubmitExpenseForValidation()
  const [savedId, setSavedId] = useState<number | null>(null)
  const [linesSaved, setLinesSaved] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'submitting' | 'error' | 'saved' | 'submitted'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirming, setConfirming] = useState(false)

  const authorId = authorPick ?? form?.authors.find((o) => o.selected)?.value ?? (user?.id ? String(user.id) : '')
  const vatRate = vatPick ?? form?.vatRates.find((o) => o.selected)?.value ?? form?.vatRates[0]?.value ?? '0'
  const currency = form?.currency || 'ZMW'
  const locked = savedId !== null

  const lineTotalIncl = (Number(lineQty) || 0) * (Number(lineUnit) || 0)

  const totals = useMemo(() => {
    let ht = 0
    let ttc = 0
    for (const l of lines) {
      const incl = l.qty * l.valueUnit
      const rate = parseFloat(l.vatrate) || 0
      ht += incl / (1 + rate / 100)
      ttc += incl
    }
    return { ht, tax: ttc - ht, ttc }
  }, [lines])

  function addLine() {
    if (!lineType) return
    const typeLabel = expenseTypes?.find((t) => String(t.id) === lineType)?.label ?? ''
    const productLabel = lineProduct !== '0' ? (form?.products.find((p) => p.value === lineProduct)?.label ?? '') : ''
    setLines((cur) => [
      ...cur,
      {
        key: crypto.randomUUID(),
        fkTypeFees: Number(lineType),
        date: lineDate,
        qty: Number(lineQty) || 1,
        valueUnit: Number(lineUnit) || 0,
        vatrate: vatRate,
        comments: lineComment.trim() || undefined,
        fkProject: lineProject !== '0' ? Number(lineProject) : undefined,
        fkProduct: lineProduct !== '0' ? Number(lineProduct) : undefined,
        typeLabel,
        productLabel,
      },
    ])
    setLineType('')
    setLineUnit('')
    setLineQty('1')
    setLineProduct('0')
    setLineComment('')
    setLineProject('0')
  }

  // The report is created once; Save Draft and Sent For Approval after it reuse that report. If its
  // lines failed to save, the next attempt saves just the lines instead of creating a second report.
  async function ensureDraft(): Promise<number> {
    let id = savedId
    if (id === null) id = await createReport()
    if (!linesSaved && lines.length > 0) {
      await saveLines.mutateAsync({
        expenseReportId: id,
        lines: lines.map((l) => ({
          fkTypeFees: l.fkTypeFees,
          date: l.date,
          comments: l.comments,
          qty: l.qty,
          valueUnit: l.valueUnit,
          vatrate: l.vatrate,
          fkProject: l.fkProject,
          fkProduct: l.fkProduct,
        })),
      })
    }
    setLinesSaved(true)
    return id
  }

  async function createReport(): Promise<number> {
    if (!dateStart || !dateEnd) throw new Error('Start date and end date are required.')
    if (!authorId) throw new Error('Choose the user this expense is for.')
    if (expenseType === 'employee' && !linkedEntity) throw new Error('Select the employee.')
    if (expenseType === 'customer' && !linkedEntity) throw new Error('Select the customer.')
    if (expenseType === 'vendor' && vendorId === '-1') throw new Error('Select the vendor.')
    const id = await createDraft.mutateAsync({
      dateStart,
      dateEnd,
      userId: Number(authorId),
      validatorId: validatorId !== '-1' ? Number(validatorId) : undefined,
      projectId: projectId !== '0' ? Number(projectId) : undefined,
      notePublic,
      notePrivate,
      expenseType,
      socid: expenseType === 'customer' ? linkedEntity?.id : expenseType === 'vendor' ? Number(vendorId) : undefined,
      employeeId: expenseType === 'employee' ? linkedEntity?.id : undefined,
    })
    setSavedId(id)
    return id
  }

  async function onSaveDraft() {
    setStatus('saving')
    setErrorMessage('')
    try {
      await ensureDraft()
      setStatus('saved')
    } catch (e) {
      setStatus('error')
      setErrorMessage(e instanceof Error ? e.message : 'Could not save the draft.')
    }
  }

  async function onSubmitForApproval() {
    setConfirming(false)
    setStatus('submitting')
    setErrorMessage('')
    try {
      const id = await ensureDraft()
      await submitForValidation.mutateAsync(id)
      setStatus('submitted')
    } catch (e) {
      setStatus('error')
      setErrorMessage(e instanceof Error ? e.message : 'Could not submit for approval.')
    }
  }

  const busy = status === 'saving' || status === 'submitting'
  const submitted = status === 'submitted'

  return (
    <div className="space-y-4 pb-20">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CheckCheck size={20} className="text-brand" /> New Expense
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading the expense form…" />}
      {isError && <LegacyErrorCard title="Couldn't load the expense form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {form && (
        <fieldset disabled={locked} className="min-w-0 border-0 p-0">
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_320px]">
            <div className="min-w-0 space-y-4">
              <Card className="!h-auto">
                <h3 className="mb-3 font-semibold text-text!">Expense Report Details</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className={labelCls}>Start date</label>
                    <div className="flex gap-2">
                      <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={`${inputCls} min-w-0 flex-1`} />
                      <NowButton onClick={() => setDateStart(iso(new Date()))} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>End date</label>
                    <div className="flex gap-2">
                      <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={`${inputCls} min-w-0 flex-1`} />
                      <NowButton onClick={() => setDateEnd(iso(new Date()))} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>User</label>
                    <select value={authorId} onChange={(e) => setAuthorPick(e.target.value)} className={`${inputCls} w-full`}>
                      {form.authors.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="mb-1.5 block text-xs font-medium text-text-muted">Expense Type</span>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_TABS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        aria-pressed={expenseType === t.value}
                        onClick={() => {
                          setExpenseType(t.value)
                          setLinkedEntity(null)
                          setVendorId('-1')
                        }}
                        className={`rounded-md border px-4 py-1.5 text-sm font-medium ${expenseType === t.value ? 'border-brand bg-brand/15 text-brand' : 'border-input-border bg-input-bg text-text-muted hover:bg-surface-hover'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {(expenseType === 'employee' || expenseType === 'customer') && (
                    <div className="mt-3 max-w-sm">
                      <EntityPicker
                        label={expenseType === 'employee' ? 'Employee' : 'Customer'}
                        value={linkedEntity}
                        onChange={setLinkedEntity}
                        type={expenseType === 'employee' ? 'user' : 'customer'}
                      />
                    </div>
                  )}
                  {expenseType === 'vendor' && (
                    <div className="mt-3 max-w-lg">
                      <label className={labelCls}>Vendor / Supplier</label>
                      <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={`${inputCls} w-full`}>
                        {form.vendors.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className={labelCls}>Note (public)</span>
                    <textarea
                      value={notePublic}
                      onChange={(e) => setNotePublic(e.target.value)}
                      rows={2}
                      placeholder="Visible to approvers..."
                      className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Note (private)</span>
                    <textarea
                      value={notePrivate}
                      onChange={(e) => setNotePrivate(e.target.value)}
                      rows={2}
                      placeholder="Internal only..."
                      className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                </div>
              </Card>

              <Card className="!h-auto !p-0 overflow-x-auto">
                <div className="flex items-center justify-between p-4 pb-0">
                  <h3 className="font-semibold text-text!">Item Table</h3>
                  <span className="text-sm text-text-faint">{lines.length === 1 ? '1 line' : `${lines.length} lines`}</span>
                </div>
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold text-text">
                      <th className="w-10 px-2 py-2 text-center">#</th>
                      <th className="px-2 py-2 text-left">Date</th>
                      <th className="px-2 py-2 text-left">Expense Type</th>
                      <th className="px-2 py-2 text-center">Qty</th>
                      <th className="px-2 py-2 text-center">VAT %</th>
                      <th className="whitespace-nowrap px-2 py-2 text-right">Unit (Incl)</th>
                      <th className="whitespace-nowrap px-2 py-2 text-right">Total (Incl)</th>
                      <th className="px-2 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={l.key} className="border-b border-border align-top">
                        <td className="px-2 py-2 text-center text-text-faint">{i + 1}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-text-muted">{l.date}</td>
                        <td className="px-2 py-2 text-text!">
                          {l.typeLabel}
                          {(l.productLabel || l.comments) && <span className="block text-xs text-text-faint">{[l.productLabel, l.comments].filter(Boolean).join(' — ')}</span>}
                        </td>
                        <td className="px-2 py-2 text-center text-text-muted">{l.qty}</td>
                        <td className="px-2 py-2 text-center text-text-muted">{form.vatRates.find((v) => v.value === l.vatrate)?.label ?? l.vatrate}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-text-muted">{l.valueUnit.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right font-medium tabular-nums text-text!">{(l.qty * l.valueUnit).toFixed(2)}</td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => setLines((cur) => cur.filter((x) => x.key !== l.key))} className="text-danger-fg hover:opacity-70" aria-label="Remove line">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-2 py-2 text-center">
                        <button type="button" onClick={() => setDetails((d) => !d)} className="text-brand" aria-label="More line details" aria-expanded={details}>
                          <PlusCircle size={16} />
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <input type="date" value={lineDate} onChange={(e) => setLineDate(e.target.value)} className={`${smallCls} w-36`} />
                      </td>
                      <td className="px-2 py-2">
                        <select value={lineType} onChange={(e) => setLineType(e.target.value)} className={`${smallCls} w-40`}>
                          <option value="">Select Expense Type</option>
                          {expenseTypes?.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="number" min="0.01" step="0.01" value={lineQty} onChange={(e) => setLineQty(e.target.value)} className={`${smallCls} w-16 text-center`} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <select value={vatRate} onChange={(e) => setVatPick(e.target.value)} className={smallCls}>
                          {form.vatRates.map((v) => (
                            <option key={v.value} value={v.value}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input type="number" step="0.01" value={lineUnit} onChange={(e) => setLineUnit(e.target.value)} placeholder="0.00" className={`${smallCls} w-24 text-right`} />
                      </td>
                      <td className="px-2 py-2 text-right font-bold tabular-nums text-brand">{lineTotalIncl.toFixed(2)}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={addLine}
                          disabled={!lineType}
                          className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </td>
                    </tr>
                    {details && (
                      <tr>
                        <td colSpan={8} className="px-3 pb-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <label className="block">
                              <span className={labelCls}>Product</span>
                              <select value={lineProduct} onChange={(e) => setLineProduct(e.target.value)} className={`${smallCls} w-full`}>
                                {form.products.map((p) => (
                                  <option key={p.value} value={p.value}>
                                    {p.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className={labelCls}>Project</span>
                              <select value={lineProject} onChange={(e) => setLineProject(e.target.value)} className={`${smallCls} w-full`}>
                                {form.projects.map((p) => (
                                  <option key={p.value} value={p.value}>
                                    {p.value === '0' ? 'Select Project' : p.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className={labelCls}>Description</span>
                              <input value={lineComment} onChange={(e) => setLineComment(e.target.value)} placeholder="Description" className={`${smallCls} w-full`} />
                            </label>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>

            <Card className="!h-auto space-y-3">
              <h3 className="font-semibold text-text!">Summary</h3>
              <label className="block">
                <span className={labelCls}>User responsible for approval</span>
                <select value={validatorId} onChange={(e) => setValidatorId(e.target.value)} className={`${inputCls} w-full`}>
                  {form.validators.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Project</span>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputCls} w-full`}>
                  {form.projects.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-2 border-t border-border pt-3 text-sm">
                <div>
                  <p className="text-xs text-text-muted">Total (Excl. Tax)</p>
                  <p className="font-bold text-text!">
                    {totals.ht.toFixed(4)} {currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Total Tax</p>
                  <p className="font-bold text-text!">
                    {totals.tax.toFixed(4)} {currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Total (Inc. Tax)</p>
                  <p className="text-lg font-bold text-brand">
                    {totals.ttc.toFixed(4)} {currency}
                  </p>
                </div>
              </div>
              <div className="border-t border-border pt-3 text-sm">
                <p className="text-xs text-text-muted">Lines</p>
                <p className="font-bold text-text!">{lines.length}</p>
              </div>
            </Card>
          </div>
        </fieldset>
      )}

      {status === 'error' && (
        <p role="alert" className="text-sm text-danger-fg">
          {errorMessage}
        </p>
      )}
      {savedId !== null && (status === 'saved' || submitted) && (
        <p className="text-sm text-success-fg">
          {submitted ? 'Expense report submitted for approval.' : 'Draft saved.'}{' '}
          <Link to={ROUTES.expenseCard.replace(':id', String(savedId))} className="font-medium underline">
            Open the expense report
          </Link>
        </p>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between border-t border-border bg-surface px-6 py-3 xl:left-[var(--sidebar-w,0px)]">
        <span className="text-sm font-medium text-text!">
          Total: {totals.ttc.toFixed(4)} {currency}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={busy || (locked && linesSaved) || !form}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50"
          >
            <Save size={14} /> Save Draft
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy || submitted || !form}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            <Send size={14} /> Sent For Approval
          </button>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirming(false)}>
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text!">Submit For Approval</h3>
            <p className="text-sm text-text!">Submit this expense report for approval?</p>
            <p className="rounded-lg bg-info-bg/50 px-3 py-2 text-left text-xs text-info-fg">Once submitted, the expense report will be sent to your validator for review.</p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
                Cancel
              </button>
              <button type="button" onClick={onSubmitForApproval} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
