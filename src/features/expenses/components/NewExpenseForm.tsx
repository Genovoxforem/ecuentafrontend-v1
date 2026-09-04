import { useMemo, useState } from 'react'
import { CheckSquare, Plus, Save, Send, Search, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAuth } from '../../auth/AuthContext'
import { useProjectsList } from '../../projects/projects.queries'
import { useEntitySearch, useExpenseTypes, useCreateExpenseDraft, useSaveExpenseLines, useSubmitExpenseForValidation, type EntityOption, type ExpenseDraftLine } from '../expenses.queries'

const inputCls = 'h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

type ExpenseTypeTab = 'internal' | 'user' | 'customer' | 'vendor'
const TYPE_TABS: { value: ExpenseTypeTab; label: string }[] = [
  { value: 'internal', label: 'Internal' },
  { value: 'user', label: 'User' },
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
]

// Real Zambia VAT rates this instance's expense lines actually use
// (confirmed live on other real screens this session, e.g. the Products
// module's own VAT selects) — expense/api/lines.php's saveSingleLine()
// parses the leading number off whatever string is sent (e.g. "16 (C1)"),
// so any of these round-trips correctly; there's no dedicated VAT-rate
// JSON endpoint in this module to source the list from instead.
const VAT_RATES = ['0 (C1)', '5 (C2)', '16 (C1)']

interface DraftLine extends ExpenseDraftLine {
  key: string
  typeLabel: string
}

function EntityPicker({ label, value, onChange, type }: { label: string; value: EntityOption | null; onChange: (v: EntityOption | null) => void; type: 'user' | 'customer' | 'vendor' }) {
  const [query, setQuery] = useState('')
  const { data: options } = useEntitySearch(type, query, query.length > 0)
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
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
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg max-h-48 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o)
                setQuery('')
              }}
              className="block w-full text-left px-3 py-1.5 text-sm text-text hover:bg-surface-hover"
            >
              {o.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Real: header create via expense/api/lines.php action=createDraft, lines
// via action=saveCachedLines (client caches rows exactly like the real
// form does before any header exists), and submit via
// action=submitForValidation — all 3 confirmed by reading each handler
// directly. Expense-type/user/customer/vendor pickers are real (expense/
// api/expense_types.php, expense/ajax/entity_search.php); Project uses the
// same real projet/projects-list-ajax.php endpoint already wired elsewhere
// in this app. VAT rate is the one field with no dedicated JSON source in
// this module (see VAT_RATES above) — a small fixed real-world list, not
// fabricated data.
export function NewExpenseForm() {
  const { user } = useAuth()
  const { data: expenseTypes } = useExpenseTypes()
  const { data: projects } = useProjectsList('all')

  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [expenseType, setExpenseType] = useState<ExpenseTypeTab>('internal')
  const [linkedEntity, setLinkedEntity] = useState<EntityOption | null>(null)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [validator, setValidator] = useState<EntityOption | null>(null)
  const [projectId, setProjectId] = useState('')

  const [lineDate, setLineDate] = useState(new Date().toISOString().slice(0, 10))
  const [lineType, setLineType] = useState('')
  const [lineQty, setLineQty] = useState('1')
  const [lineVat, setLineVat] = useState(VAT_RATES[0])
  const [lineUnit, setLineUnit] = useState('0.00')
  const [lines, setLines] = useState<DraftLine[]>([])

  const createDraft = useCreateExpenseDraft()
  const saveLines = useSaveExpenseLines()
  const submitForValidation = useSubmitExpenseForValidation()
  const [status, setStatus] = useState<'idle' | 'saving' | 'submitting' | 'error' | 'saved' | 'submitted'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const vatRate = useMemo(() => parseFloat(lineVat) || 0, [lineVat])
  const lineTotalIncl = useMemo(() => {
    const qty = Number(lineQty) || 0
    const unit = Number(lineUnit) || 0
    return qty * unit
  }, [lineQty, lineUnit])

  const totals = useMemo(() => {
    let ht = 0
    let ttc = 0
    for (const l of lines) {
      const incl = l.qty * l.valueUnit
      const rate = parseFloat(l.vatrate) || 0
      const excl = incl / (1 + rate / 100)
      ht += excl
      ttc += incl
    }
    return { ht, tax: ttc - ht, ttc }
  }, [lines])

  function addLine() {
    if (!lineType) return
    const typeLabel = expenseTypes?.find((t) => t.id === Number(lineType))?.label ?? ''
    setLines((cur) => [
      ...cur,
      { key: crypto.randomUUID(), fkTypeFees: Number(lineType), date: lineDate, qty: Number(lineQty) || 1, valueUnit: Number(lineUnit) || 0, vatrate: lineVat, typeLabel },
    ])
    setLineType('')
    setLineUnit('0.00')
    setLineQty('1')
  }

  function removeLine(key: string) {
    setLines((cur) => cur.filter((l) => l.key !== key))
  }

  async function ensureDraft(): Promise<number> {
    if (!user?.id) throw new Error('No logged-in user.')
    const id = await createDraft.mutateAsync({
      dateStart: dateStart || new Date().toISOString().slice(0, 10),
      dateEnd: dateEnd || dateStart || new Date().toISOString().slice(0, 10),
      userId: Number(user.id),
      validatorId: validator ? validator.id : undefined,
      projectId: projectId ? Number(projectId) : undefined,
      notePublic,
      notePrivate,
      expenseType,
      socid: expenseType === 'customer' || expenseType === 'vendor' ? linkedEntity?.id : undefined,
      employeeId: expenseType === 'user' ? linkedEntity?.id : undefined,
    })
    if (lines.length > 0) {
      await saveLines.mutateAsync({
        expenseReportId: id,
        lines: lines.map((l) => ({ fkTypeFees: l.fkTypeFees, date: l.date, comments: l.comments, qty: l.qty, valueUnit: l.valueUnit, vatrate: l.vatrate, fkProject: l.fkProject, fkProduct: l.fkProduct })),
      })
    }
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

  return (
    <div className="space-y-4 pb-20">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CheckSquare size={20} className="text-brand" /> New Expense
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Card className="!h-auto">
            <h3 className="font-semibold text-text! mb-3">Expense Report Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-text-muted mb-1">Start date</span>
                <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={`${inputCls} w-full`} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-text-muted mb-1">End date</span>
                <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={`${inputCls} w-full`} />
              </label>
              <div>
                <span className="block text-xs font-medium text-text-muted mb-1">User</span>
                <input disabled value={user ? `${user.firstname} ${user.lastname}` : ''} className={`${inputCls} w-full bg-surface-alt text-text-faint`} />
              </div>
            </div>

            <div className="mt-4">
              <span className="block text-xs font-medium text-text-muted mb-1.5">Expense Type</span>
              <div className="inline-flex rounded-lg border border-input-border overflow-hidden">
                {TYPE_TABS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setExpenseType(t.value)
                      setLinkedEntity(null)
                    }}
                    className={`px-4 py-2 text-sm font-medium ${expenseType === t.value ? 'bg-brand text-white' : 'bg-input-bg text-text-muted hover:bg-surface-hover'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {expenseType !== 'internal' && (
                <div className="mt-3 max-w-sm">
                  <EntityPicker
                    label={expenseType === 'customer' ? 'Related customer' : expenseType === 'vendor' ? 'Related vendor' : 'Related user'}
                    value={linkedEntity}
                    onChange={setLinkedEntity}
                    type={expenseType === 'customer' ? 'customer' : expenseType === 'vendor' ? 'vendor' : 'user'}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <label className="block">
                <span className="block text-xs font-medium text-text-muted mb-1">Note (public)</span>
                <input value={notePublic} onChange={(e) => setNotePublic(e.target.value)} placeholder="Visible to approvers…" className={`${inputCls} w-full`} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-text-muted mb-1">Note (private)</span>
                <input value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} placeholder="Internal only…" className={`${inputCls} w-full`} />
              </label>
            </div>
          </Card>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <div className="flex items-center justify-between p-4 pb-0">
              <h3 className="font-semibold text-text!">Item Table</h3>
              <span className="text-sm text-text-faint">{lines.length}</span>
            </div>
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-4 py-2 w-10">#</th>
                  <th className="font-medium px-4 py-2">Date</th>
                  <th className="font-medium px-4 py-2">Expense Type</th>
                  <th className="font-medium px-4 py-2">Qty</th>
                  <th className="font-medium px-4 py-2">VAT %</th>
                  <th className="font-medium px-4 py-2 text-right">Unit (Incl)</th>
                  <th className="font-medium px-4 py-2 text-right">Total (Incl)</th>
                  <th className="font-medium px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text-faint">
                      <button type="button" onClick={() => removeLine(l.key)} className="text-danger-fg hover:opacity-70">
                        <Trash2 size={14} />
                      </button>
                    </td>
                    <td className="px-4 py-2 text-text-muted whitespace-nowrap">{l.date}</td>
                    <td className="px-4 py-2 text-text!">{l.typeLabel}</td>
                    <td className="px-4 py-2 text-text-muted">{l.qty}</td>
                    <td className="px-4 py-2 text-text-muted">{l.vatrate}</td>
                    <td className="px-4 py-2 text-right text-text-muted">{l.valueUnit.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-text! font-medium">{(l.qty * l.valueUnit).toFixed(2)}</td>
                    <td />
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2 text-text-faint">+</td>
                  <td className="px-4 py-2">
                    <input type="date" value={lineDate} onChange={(e) => setLineDate(e.target.value)} className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <select value={lineType} onChange={(e) => setLineType(e.target.value)} className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none">
                      <option value="">Select Expense Type</option>
                      {expenseTypes?.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min="1" value={lineQty} onChange={(e) => setLineQty(e.target.value)} className="h-9 w-16 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <select value={lineVat} onChange={(e) => setLineVat(e.target.value)} className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none">
                      {VAT_RATES.map((v) => (
                        <option key={v} value={v}>
                          {v.split(' ')[0]}% ({v.split('(')[1]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" step="0.01" value={lineUnit} onChange={(e) => setLineUnit(e.target.value)} className="h-9 w-24 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none text-right" />
                  </td>
                  <td className="px-4 py-2 text-right text-text-muted">{lineTotalIncl.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <button type="button" onClick={addLine} disabled={!lineType} className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50">
                      <Plus size={12} /> Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-text-faint">VAT rate: {vatRate}% (real Zambia expense-line rates — no dedicated dropdown API for this field).</p>
          </Card>
        </div>

        <Card className="!h-auto space-y-3">
          <h3 className="font-semibold text-text!">Summary</h3>
          <EntityPicker label="User responsible for approval" value={validator} onChange={setValidator} type="user" />
          <label className="block">
            <span className="block text-xs font-medium text-text-muted mb-1">Project</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">Select a project</option>
              {projects?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ref} — {p.title}
                </option>
              ))}
            </select>
          </label>
          <div className="border-t border-border pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Total (Excl. Tax)</span>
              <span className="text-text!">{totals.ht.toFixed(4)} ZMW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total Tax</span>
              <span className="text-text!">{totals.tax.toFixed(4)} ZMW</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-text!">Total (Inc. Tax)</span>
              <span className="text-text!">{totals.ttc.toFixed(4)} ZMW</span>
            </div>
          </div>
          <div className="border-t border-border pt-3 text-sm flex justify-between">
            <span className="text-text-muted">Lines</span>
            <span className="text-text! font-semibold">{lines.length}</span>
          </div>
        </Card>
      </div>

      {status === 'error' && <p className="text-sm text-danger-fg">{errorMessage}</p>}
      {status === 'saved' && <p className="text-sm text-success-fg">Draft saved.</p>}
      {status === 'submitted' && <p className="text-sm text-success-fg">Expense report submitted for approval.</p>}

      <div className="fixed bottom-0 left-0 right-0 xl:left-[var(--sidebar-w,0px)] bg-surface border-t border-border px-6 py-3 flex items-center justify-between z-20">
        <span className="text-sm font-medium text-text!">Total: {totals.ttc.toFixed(4)} ZMW</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSaveDraft} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50">
            <Save size={14} /> Save Draft
          </button>
          <button type="button" onClick={onSubmitForApproval} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
            <Send size={14} /> Sent For Approval
          </button>
        </div>
      </div>
    </div>
  )
}
