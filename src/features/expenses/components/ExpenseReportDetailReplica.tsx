import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Receipt, Pencil, Copy, Trash2, X, FileText, AlertTriangle, Loader2, Save } from 'lucide-react'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { useExpenseReportCard } from '../expenseReportCard.queries'
import { useDeleteExpenseReport, useCloneExpenseReport } from '../expenseReportActions.queries'
import { useUpdateExpenseReport } from '../expenseReportUpdate.queries'
import type { ExpenseReportCard } from '../expenseReportCardParser'
import type { ExpenseReportTabKey } from './ExpenseReportDetailTabs'
import { ROUTES } from '../../../routes'

// Non-default tabs (Linked files/Notes/Events/LedgerEntry) are lazy-loaded
// from their own chunk, same pattern as OrderDetailTabs.tsx/
// QuotationDetailTabs.tsx — only fetched once the person actually clicks
// that tab, not on every Expense Report page load.
const LazyTabRenderer = lazy(() => import('./ExpenseReportDetailTabs').then((m) => ({ default: m.LazyTabRenderer })))

const STATUS_STYLES: Record<string, string> = {
  'badge-status0': 'bg-neutral-bg text-neutral-fg', // Draft
  'badge-status2': 'bg-info-bg text-info-fg', // Validated
  'badge-status4': 'bg-warning-bg text-warning-fg', // Canceled
  'badge-status5': 'bg-success-bg text-success-fg', // Approved
  'badge-status6': 'bg-success-bg text-success-fg', // Paid
  'badge-status99': 'bg-danger-bg text-danger-fg', // Refused
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '—'
}

// Every field this page links out to resolves to a page this app already
// builds natively — routed in-app instead of leaving the SPA. No fallback
// external link: a field whose href doesn't match one of these real,
// already-confirmed id spaces renders as plain text instead.
function resolveInAppLink(href: string): string | null {
  const userMatch = href.match(/\/(?:userprofile\/index|user\/card)\.php\?id=(\d+)/)
  if (userMatch) return ROUTES.userDetail.replace(':id', userMatch[1])
  const socidMatch = href.match(/[?&]socid=(\d+)/)
  if (socidMatch) return ROUTES.customerDetail.replace(':id', socidMatch[1])
  const facidMatch = href.match(/[?&]facid=(\d+)/)
  if (facidMatch) return ROUTES.vendorInvoiceDetail.replace(':id', facidMatch[1])
  return null
}

function FieldRow({ label, value, href }: { label: string; value: string; href: string | null }) {
  const looksLikePerson = /user|responsible/i.test(label) && value
  const inAppTo = href ? resolveInAppLink(href) : null
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 py-1.5 text-sm">
      <span className="text-text-faint">{label}</span>
      {value ? (
        <div className="flex items-center gap-2 min-w-0">
          {looksLikePerson && (
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center">{initials(value)}</span>
          )}
          {inAppTo ? (
            <Link to={inAppTo} className="text-brand hover:underline font-medium truncate">
              {value}
            </Link>
          ) : (
            <span className="text-text-muted font-medium truncate">{value}</span>
          )}
        </div>
      ) : (
        <span className="text-text-faint">—</span>
      )}
    </div>
  )
}

// MM/DD/YYYY (the real field's own format) <-> YYYY-MM-DD (native <input
// type="date">).
function toIsoDate(mmddyyyy: string): string {
  const m = mmddyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}
function toUsDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

// Real inline edit for the 2 fields this page's own Details panel shows
// that the real edit form can change (Period, User responsible for
// approval) — POSTs the real action=update handler (see
// expenseReportUpdate.queries.ts). The real edit form has many more fields
// (address/bank/multicurrency/etc.) that don't apply to an expense report
// and aren't shown anywhere on this page, so they're out of scope here.
function DetailsPanel({ data, id }: { data: ExpenseReportCard; id: string | undefined }) {
  const [editing, setEditing] = useState(false)
  const periodField = data.fields.find((f) => f.label === 'Period')
  const periodMatch = periodField?.value.match(/From (\S+) to (\S+)/)
  const [dateDebut, setDateDebut] = useState(toIsoDate(periodMatch?.[1] ?? ''))
  const [dateFin, setDateFin] = useState(toIsoDate(periodMatch?.[2] ?? ''))
  const validatorField = data.fields.find((f) => f.label === 'User responsible for approval')
  const [validator, setValidator] = useState('-1')
  const update = useUpdateExpenseReport(id)

  const otherFields = data.fields.filter((f) => f.label !== 'Period' && f.label !== 'User responsible for approval')

  async function handleSave() {
    await update.mutateAsync({ token: data.token, dateDebut: toUsDate(dateDebut), dateFin: toUsDate(dateFin), fkUserValidator: validator })
    setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-text!">Details</h3>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>

      {otherFields.map((f) => (
        <FieldRow key={f.label} label={f.label} value={f.value} href={f.href} />
      ))}

      {editing ? (
        <>
          <div className="grid grid-cols-[180px_1fr] gap-3 py-1.5 text-sm items-center">
            <span className="text-text-faint">Period</span>
            <div className="flex items-center gap-2">
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="text-xs rounded-md border border-input-border bg-input-bg text-text px-2 py-1" />
              <span className="text-text-faint">to</span>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="text-xs rounded-md border border-input-border bg-input-bg text-text px-2 py-1" />
            </div>
          </div>
          <div className="grid grid-cols-[180px_1fr] gap-3 py-1.5 text-sm items-center">
            <span className="text-text-faint">User responsible for approval</span>
            <select value={validator} onChange={(e) => setValidator(e.target.value)} className="text-xs rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 max-w-xs">
              <option value="-1">Select a user</option>
              {data.cloneUserOptions
                .filter((o) => o.value !== '')
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
          </div>
          {update.isError && <p className="text-xs text-danger mt-1">{update.error instanceof Error ? update.error.message : 'Save failed.'}</p>}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              disabled={update.isPending}
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {update.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <FieldRow label="Period" value={periodField?.value ?? ''} href={null} />
          <FieldRow label="User responsible for approval" value={validatorField?.value ?? ''} href={validatorField?.href ?? null} />
        </>
      )}
    </div>
  )
}

// Small confirm modal for the real "Choose the data you want to clone"
// step — confirmed live the real backend genuinely requires picking which
// user to clone the report for (its own #userid select, not optional).
function CloneModal({ data, id, onClose }: { data: ExpenseReportCard; id: string | undefined; onClose: () => void }) {
  const [userid, setUserid] = useState(data.cloneUserOptions.find((o) => o.value)?.value ?? '')
  const clone = useCloneExpenseReport(id)
  const navigate = useNavigate()

  async function handleConfirm() {
    await clone.mutateAsync({ token: data.token, userid })
    onClose()
    navigate(ROUTES.expenseReportsList)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="bg-surface-alt rounded-xl border border-border shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text!">Choose the data you want to clone</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">User</span>
            <select value={userid} onChange={(e) => setUserid(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
              {data.cloneUserOptions
                .filter((o) => o.value)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
          </label>
          {clone.isError && <p className="text-xs text-danger">{clone.error instanceof Error ? clone.error.message : 'Clone failed.'}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={!userid || clone.isPending}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {clone.isPending && <Loader2 size={13} className="animate-spin" />} Create
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'text-xs rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5'

interface DraftLine {
  id: string
  date: string
  typeValue: string
  typeLabel: string
  projectValue: string
  projectLabel: string
  description: string
  qty: number
  vatValue: string
  vatLabel: string
  unitPriceExcl: number
}

function vatRatePercent(vatValue: string): number {
  return Number(vatValue.match(/-?\d+(\.\d+)?/)?.[0] ?? 0)
}

// The real add-line row (#fk_c_type_fees/#line_fk_project/#vatrate, all
// real options — see expenseReportCardParser.ts) is functional here: type/
// project/VAT/date/qty/price validate and add a line to this component's
// own local state, same first step the real page's own JS does (caches the
// line client-side before any server round-trip — see expense_manager.js's
// addLineFromInline). What's NOT wired: persisting that line server-side.
// The real save endpoint (expensereport/api/expense_report_lines_api.php,
// action=saveCachedLines) was tested live against 172.16.5.10 under a real
// authenticated session and returned a bare 500 with no error detail —
// a genuine server-side fault, not a request-format issue on this end — so
// rather than ship something that silently fails, lines added here stay
// local to this browser tab (clearly labeled) instead of claiming to save.
function ItemTableEditor({
  data,
  itemColumns,
  onDelete,
  onClone,
  deleting,
  cloning,
}: {
  data: ExpenseReportCard
  itemColumns: string[]
  onDelete: () => void
  onClone: () => void
  deleting: boolean
  cloning: boolean
}) {
  const [draftLines, setDraftLines] = useState<DraftLine[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [typeValue, setTypeValue] = useState('-1')
  const [projectValue, setProjectValue] = useState('0')
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState('1')
  const [vatValue, setVatValue] = useState(data.vatRateOptions[0]?.value ?? '0')
  const [unitPriceExcl, setUnitPriceExcl] = useState('0.00')
  const [formError, setFormError] = useState<string | null>(null)

  const vatRate = vatRatePercent(vatValue)
  const previewExcl = (Number(qty) || 0) * (Number(unitPriceExcl) || 0)
  const previewIncl = previewExcl * (1 + vatRate / 100)

  function handleAdd() {
    const typeLabel = data.expenseTypeOptions.find((o) => o.value === typeValue)?.label ?? ''
    const price = Number(unitPriceExcl) || 0
    // Same validation the real page's own addLineFromInline() runs: type
    // required, date required, a positive amount required.
    if (typeValue === '-1' || !typeValue) return setFormError('Expense Type is required.')
    if (!date) return setFormError('Date is required.')
    if (price <= 0) return setFormError('Enter a valid amount.')
    setFormError(null)
    const projectLabel = data.projectOptions.find((o) => o.value === projectValue)?.label ?? ''
    const vatLabel = data.vatRateOptions.find((o) => o.value === vatValue)?.label ?? vatValue
    setDraftLines((lines) => [
      ...lines,
      { id: `draft-${Date.now()}`, date, typeValue, typeLabel, projectValue, projectLabel: projectLabel === 'Select a project' ? '' : projectLabel, description, qty: Number(qty) || 1, vatValue, vatLabel, unitPriceExcl: price },
    ])
    setDescription('')
    setUnitPriceExcl('0.00')
  }

  return (
    <div className="py-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text!">Item Table</h3>
      </div>

      {draftLines.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-warning-bg/50 border border-warning/40 px-3 py-2 mb-3 text-xs text-warning-fg">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            {draftLines.length} line{draftLines.length > 1 ? 's' : ''} added below — <strong>not yet saved to the server.</strong> The real save endpoint returned a
            server error when tested live, so these stay local to this browser tab for now rather than risk a silent failure.
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[11px] text-text-faint uppercase tracking-wide border-b border-border">
              {itemColumns.map((col, i) => (
                <th key={i} className="font-semibold px-2 py-2 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line, i) => (
              <tr key={`real-${i}`} className="border-b border-border">
                {line.cells.map((c, j) => (
                  <td key={j} className="px-2 py-2 text-text-muted whitespace-nowrap">
                    {c || '—'}
                  </td>
                ))}
              </tr>
            ))}
            {draftLines.map((line) => {
              const totalExcl = line.qty * line.unitPriceExcl
              const totalIncl = totalExcl * (1 + vatRatePercent(line.vatValue) / 100)
              return (
                <tr key={line.id} className="border-b border-border bg-warning-bg/20">
                  <td className="px-2 py-2 whitespace-nowrap">{line.date}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{line.typeLabel}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{line.projectLabel || '—'}</td>
                  <td className="px-2 py-2">{line.description || '—'}</td>
                  <td className="px-2 py-2">{line.qty}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{line.vatLabel}</td>
                  <td className="px-2 py-2">{line.unitPriceExcl.toFixed(2)}</td>
                  <td className="px-2 py-2">{(line.unitPriceExcl * (1 + vatRatePercent(line.vatValue) / 100)).toFixed(2)}</td>
                  <td className="px-2 py-2">{totalExcl.toFixed(2)}</td>
                  <td className="px-2 py-2">{totalIncl.toFixed(2)}</td>
                  <td className="px-2 py-2 text-text-faint">—</td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => setDraftLines((lines) => lines.filter((l) => l.id !== line.id))} title="Remove" className="text-danger hover:text-danger-fg">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
            <tr>
              <td className="px-2 py-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-32 ${inputCls}`} />
              </td>
              <td className="px-2 py-2">
                <select value={typeValue} onChange={(e) => setTypeValue(e.target.value)} className={`w-36 ${inputCls}`}>
                  {data.expenseTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-2">
                <select value={projectValue} onChange={(e) => setProjectValue(e.target.value)} className={`w-32 ${inputCls}`}>
                  {data.projectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-2">
                <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className={`w-36 ${inputCls}`} />
              </td>
              <td className="px-2 py-2">
                <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className={`w-14 ${inputCls}`} />
              </td>
              <td className="px-2 py-2">
                <select value={vatValue} onChange={(e) => setVatValue(e.target.value)} className={`w-20 ${inputCls}`}>
                  {data.vatRateOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-2">
                <input type="number" step="0.01" value={unitPriceExcl} onChange={(e) => setUnitPriceExcl(e.target.value)} className={`w-20 ${inputCls}`} />
              </td>
              <td className="px-2 py-2 text-text-faint">{(Number(unitPriceExcl || 0) * (1 + vatRate / 100)).toFixed(2)}</td>
              <td className="px-2 py-2 text-text-faint">{previewExcl.toFixed(2)}</td>
              <td className="px-2 py-2 text-text-faint">{previewIncl.toFixed(2)}</td>
              <td className="px-2 py-2 text-text-faint" title="Receipt upload isn't wired for locally-added lines yet.">
                —
              </td>
              <td className="px-2 py-2">
                <button type="button" onClick={handleAdd} className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-hover">
                  + Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {formError && <p className="text-xs text-danger mt-2">{formError}</p>}

      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={onClone}
          disabled={cloning}
          className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold border border-border text-text hover:bg-surface-hover disabled:opacity-50"
        >
          <Copy size={12} /> Clone
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold border border-danger/40 text-danger hover:bg-danger-bg disabled:opacity-50"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
        </button>
      </div>
    </div>
  )
}

// Native replacement for linking out to expensereport/card.php?id=X — this
// is Dolibarr's real, distinct Expense Report module (see
// expenseReportsList.queries.ts's own header comment for how it differs
// from the expense/ SPA module this route previously replicated). Laid out
// flat (no card boxes) to match the real page's own single-column layout —
// header banner, tab bar, User/Period/Validation/Amount summary, Item
// Table, Payments, Linked files — rather than the boxed-card treatment used
// elsewhere in this app. Every action button and every field link routes
// in-app or performs a real backend call — no external links left (see
// resolveInAppLink, expenseReportActions.queries.ts,
// expenseReportUpdate.queries.ts). The Item Table's own Add-line editor and
// the doc generator stay disabled (see their own tooltips): the former's
// real save endpoint 500s live (see ItemTableEditor's own comment), the
// latter streams a real file, not JSON.
export function ExpenseReportDetailReplica() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useExpenseReportCard(id)
  const [tab, setTab] = useState<'card' | ExpenseReportTabKey>('card')
  const [showCloneModal, setShowCloneModal] = useState(false)
  const navigate = useNavigate()
  const deleteReport = useDeleteExpenseReport(id)
  const confirm = useConfirm()

  if (isLoading) return <LegacyLoadingCard label="Loading expense report…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load expense report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const statusClass = STATUS_STYLES[data.statusClass] ?? STATUS_STYLES['badge-status0']
  const itemColumns =
    data.itemColumns.length > 0
      ? data.itemColumns
      : ['Date', 'Expense Type', 'Project', 'Description', 'Qty', 'VAT %', `Unit Price (Excl.) (${data.currency})`, 'Unit Price (Inc. Tax)', `Total (Excl.) (${data.currency})`, 'Total TTC (Inc. Tax)', 'Receipt', 'Action']

  const handleDelete = async () => {
    const subject = data.ref || `expense report #${id}`
    const ok = await confirm({
      title: 'Delete Expense Report?',
      message: (
        <>
          Are you sure you want to delete <strong className="text-text!">{subject}</strong>?
        </>
      ),
    })
    if (!ok) return
    await deleteReport.mutateAsync(data.token)
    navigate(ROUTES.expenseReportsList)
  }

  return (
    <div className="space-y-0">
      {/* Header banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <Receipt size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-text!">Ref No : {data.ref || `#${id}`}</p>
            <p className="text-xs text-text-faint mt-0.5">Project : {data.projectLabel || ' '}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${statusClass}`}>{data.status || 'Draft'}</span>
            {data.ledgerStatusText && <p className="text-xs text-text-faint mt-1">{data.ledgerStatusText}</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowCloneModal(true)}
              title="Clone"
              className="grid place-items-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-surface-hover hover:text-text"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteReport.isPending}
              title="Delete"
              className="grid place-items-center w-8 h-8 rounded-lg border border-border text-danger hover:border-danger/40 hover:bg-surface-hover disabled:opacity-50"
            >
              {deleteReport.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.expenseReportsList)}
              title="Close"
              className="grid place-items-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-surface-hover hover:text-text"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar — all 5 real tabs switch in-app. */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar">
        {(data.tabs.length > 0 ? data.tabs : [{ key: 'card', label: 'Expense report', href: '', active: true }]).map((t) => {
          const isCard = t.key === 'card'
          const isActiveTab = isCard ? tab === 'card' : tab === t.key
          return (
            <button
              key={t.key || t.label}
              type="button"
              onClick={() => setTab(isCard ? 'card' : (t.key as ExpenseReportTabKey))}
              className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wide whitespace-nowrap border-b-2 -mb-px ${
                isActiveTab ? 'border-brand text-brand' : 'border-transparent text-text-faint hover:text-text'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab !== 'card' ? (
        <div className="py-4">
          <Suspense fallback={<LegacyLoadingCard label="Loading…" />}>
            <LazyTabRenderer tab={tab} id={id} />
          </Suspense>
        </div>
      ) : (
        <>
          {/* User / Period / Validation / Amount summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 py-4 border-b border-border">
            <DetailsPanel data={data} id={id} />
            <div className="lg:border-l lg:border-border lg:pl-8">
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-text-faint">Amount (Excl. Tax)</span>
                <span className="font-semibold text-text!">{data.amountExclTax || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-text-faint">VAT</span>
                <span className="font-semibold text-text!">{data.vat || `0.00 ${data.currency}`}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-text-faint">Amount (Inc. Tax)</span>
                <span className="font-bold text-brand">{data.amountIncTax || `0.00 ${data.currency}`}</span>
              </div>
            </div>
          </div>

          <ItemTableEditor data={data} itemColumns={itemColumns} onDelete={handleDelete} onClone={() => setShowCloneModal(true)} deleting={deleteReport.isPending} cloning={false} />

          {/* Payments */}
          <div className="py-4 border-b border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-semibold px-2 py-2">Payments</th>
                  <th className="font-semibold px-2 py-2">Date</th>
                  <th className="font-semibold px-2 py-2">Type</th>
                  <th className="font-semibold px-2 py-2 text-right">Bank Account</th>
                  <th className="font-semibold px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td colSpan={4} className="px-2 py-2 text-right text-text-faint">
                    Already Paid:
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-text!">{data.payments.alreadyPaid || '0.00'}</td>
                </tr>
                <tr className="border-b border-border">
                  <td colSpan={4} className="px-2 py-2 text-right text-text-faint">
                    Amount Claimed:
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-text!">{data.payments.amountClaimed || '0.00'}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-right text-text-faint">
                    Remaining Unpaid:
                  </td>
                  <td className="px-2 py-2 text-right font-bold text-brand">{data.payments.remainingUnpaid || '0.00'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Linked files */}
          <div className="py-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-text!">
              <FileText size={15} className="text-brand" /> Linked files
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <select disabled defaultValue={data.docTemplateOptions[0]} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 cursor-not-allowed">
                {data.docTemplateOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <select disabled defaultValue="English (United States)" className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 cursor-not-allowed">
                <option>English (United States)</option>
              </select>
              <button
                type="button"
                disabled
                title="Generate isn't wired — the real builddoc action is a classic form-POST that streams a file, no JSON."
                className="rounded-md bg-brand/50 px-4 py-2 text-sm font-medium text-white cursor-not-allowed"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-text-faint italic">None</p>
          </div>
        </>
      )}

      {showCloneModal && <CloneModal data={data} id={id} onClose={() => setShowCloneModal(false)} />}
    </div>
  )
}
