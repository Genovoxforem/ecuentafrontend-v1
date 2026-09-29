import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Ban,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  History,
  Link2,
  ListChecks,
  Mail,
  Paperclip,
  Pencil,
  Printer,
  RotateCcw,
  Send,
  StickyNote,
  Trash2,
  Upload,
  UserCheck,
  UserRound,
  Wallet,
  X,
  Check,
  Copy,
  Download,
  CalendarDays,
  Receipt,
  Building2,
  Truck,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import {
  useCloneExpense,
  useDeleteExpense,
  useDeleteExpenseDocument,
  useExpenseCard,
  useExpenseDocuments,
  useExpenseStatusAction,
  useUploadExpenseDocument,
  type ExpenseStatusAction,
} from '../expenseCard.queries'
import type { ExpenseCardAction, ExpenseCardPage, ExpenseCardPerson } from '../expenseCardParser'
import { controlCls } from '../expenseTable'
import { ExpensePayDialog } from './ExpensePayDialog'
import { PrintPreviewDialog } from './PrintPreviewDialog'
import { SendExpenseEmailModal } from './SendExpenseEmailModal'
import { StatusBadge, PaidBadge } from './expenseParts'

const amount = (s: string) => parseFloat(s.replace(/,/g, '')) || 0

// What each status button asks before it acts (the backend's own confirm dialogs).
const CONFIRMS: Record<ExpenseStatusAction | 'delete', { title: string; message: (ref: string) => string; comment?: boolean; danger?: boolean }> = {
  validate: { title: 'Validate & Submit', message: () => 'Are you sure you want to validate and submit this expense report?' },
  setDraft: { title: 'Back to Draft', message: () => 'Are you sure you want to move this expense report back to Draft?' },
  approve: { title: 'Approve', message: () => 'Are you sure you want to approve this expense report?' },
  deny: { title: 'Deny', message: () => 'Are you sure you want to deny this expense report?', comment: true },
  cancel: { title: 'Cancel', message: () => 'Are you sure you want to cancel this expense report?', comment: true },
  markPaid: { title: 'Mark as Paid', message: () => 'Mark this expense report as paid?' },
  delete: { title: 'Delete', message: (ref) => `Are you sure you want to delete ${ref}? This cannot be undone.`, danger: true },
}

const BUTTONS: Record<ExpenseCardAction, { label: string; icon: ReactNode }> = {
  sendEmail: { label: 'Send Email', icon: <Mail size={14} /> },
  print: { label: 'Print', icon: <Printer size={14} /> },
  modify: { label: 'Modify', icon: <Pencil size={14} /> },
  validate: { label: 'Validate & Submit', icon: <Send size={14} /> },
  setDraft: { label: 'Back to Draft', icon: <RotateCcw size={14} /> },
  approve: { label: 'Approve', icon: <Check size={14} /> },
  deny: { label: 'Deny', icon: <X size={14} /> },
  cancel: { label: 'Cancel', icon: <Ban size={14} /> },
  recordPayment: { label: 'Record Payment', icon: <Banknote size={14} /> },
  markPaid: { label: 'Mark Paid', icon: <Banknote size={14} /> },
  clone: { label: 'Clone', icon: <Copy size={14} /> },
  delete: { label: 'Delete', icon: <Trash2 size={14} /> },
}

const btnCls = 'inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60'

type Dialog = { kind: ExpenseStatusAction | 'delete' } | { kind: 'clone' } | { kind: 'pay' } | { kind: 'email' } | { kind: 'print' } | null

// ── Small building blocks ────────────────────────────────────────────────────────────────────────────
function SideCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <h3 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-text!">
        <span className="text-text-faint">{icon}</span> {title}
      </h3>
      <div className="p-4 text-sm">{children}</div>
    </Card>
  )
}

function PersonRow({ person, size = 40 }: { person: ExpenseCardPerson; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar photo={person.photo} name={person.name} size={size} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-text!">{person.name}</p>
        {person.sub && <p className="text-xs text-text-faint">{person.sub}</p>}
      </div>
    </div>
  )
}

// A confirm dialog for a status change or a delete (with a comment box where the backend asks for one).
function ConfirmDialog({ id, card, kind, onClose }: { id: string; card: ExpenseCardPage; kind: ExpenseStatusAction | 'delete'; onClose: () => void }) {
  const navigate = useNavigate()
  const [comment, setComment] = useState('')
  const status = useExpenseStatusAction(id)
  const remove = useDeleteExpense(id)
  const spec = CONFIRMS[kind]
  const busy = status.isPending || remove.isPending
  const failure = status.error ?? remove.error

  async function confirm() {
    try {
      if (kind === 'delete') {
        await remove.mutateAsync()
        navigate(ROUTES.expensesList)
        return
      }
      await status.mutateAsync({ action: kind, comment })
      onClose()
    } catch {
      // The refusal is shown below.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-text!">{spec.title}</h3>
        <p className="text-sm text-text-muted">{spec.message(card.ref)}</p>
        {spec.comment && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-muted">Comment</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Optional comment..."
              className="w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
        )}
        {failure && (
          <p role="alert" className="text-sm text-danger-fg">
            {failure instanceof Error ? failure.message : 'The action was refused.'}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-input-border px-4 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60 ${spec.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-hover'}`}
          >
            {busy ? 'Working…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Clone: a new draft with the same lines, for the chosen employee.
function CloneDialog({ id, card, onClose }: { id: string; card: ExpenseCardPage; onClose: () => void }) {
  const navigate = useNavigate()
  const users = card.cloneUsers.filter((u) => u.value !== '' && u.value !== '-1')
  const [userId, setUserId] = useState(users.find((u) => u.selected)?.value ?? users[0]?.value ?? '')
  const clone = useCloneExpense(id)

  async function submit() {
    try {
      const newId = await clone.mutateAsync(userId)
      navigate(ROUTES.expenseCard.replace(':id', newId))
    } catch {
      // Shown below.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-text!">Clone Expense Report</h3>
        <p className="text-xs text-text-muted">Creates a new draft expense report with the same lines. You can select a different employee.</p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text-muted">Target Employee</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={`${controlCls} w-full`}>
            {users.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        {clone.isError && (
          <p role="alert" className="text-sm text-danger-fg">
            {clone.error instanceof Error ? clone.error.message : 'Could not clone the expense report.'}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-input-border px-4 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={clone.isPending || !userId} className={btnCls}>
            <Copy size={14} /> {clone.isPending ? 'Cloning…' : 'Clone'}
          </button>
        </div>
      </div>
    </div>
  )
}

// The report's files: upload, download, delete (expense/api/documents.php).
function DocumentsCard({ id, canUpload }: { id: string; canUpload: boolean }) {
  const { data, isLoading, isError, error } = useExpenseDocuments(id)
  const upload = useUploadExpenseDocument(id)
  const remove = useDeleteExpenseDocument(id)
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const problem = upload.error ?? remove.error

  async function send() {
    if (!file) return
    try {
      await upload.mutateAsync(file)
      setFile(null)
      if (input.current) input.current.value = ''
    } catch {
      // Shown below.
    }
  }

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <h3 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-text!">
        <Paperclip size={15} className="text-text-faint" /> Documents
        <span className="rounded bg-surface-alt px-2 py-0.5 text-xs font-normal text-text-muted">{data ? `${data.files.length} file${data.files.length === 1 ? '' : 's'}` : '0 files'}</span>
        {data?.totalSize && <span className="text-xs font-normal text-text-faint">{data.totalSize}</span>}
      </h3>
      <div className="space-y-3 p-4">
        {canUpload && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed border-border p-3">
            <input
              ref={input}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="min-w-0 flex-1 text-sm text-text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
            />
            <button
              type="button"
              onClick={send}
              disabled={!file || upload.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
            >
              <Upload size={14} /> {upload.isPending ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        )}
        {problem && (
          <p role="alert" className="text-sm text-danger-fg">
            {problem instanceof Error ? problem.message : 'The request was refused.'}
          </p>
        )}
        {isLoading && <p className="py-3 text-center text-sm text-text-faint">Loading documents…</p>}
        {isError && <p className="py-3 text-center text-sm text-danger-fg">{error instanceof Error ? error.message : 'Could not load the documents.'}</p>}
        {data && data.files.length === 0 && <p className="py-3 text-center text-sm italic text-text-faint">No files attached.</p>}
        {data?.files.map((f) => (
          <div key={f.name} className="flex items-center gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
            {f.thumbUrl ? <img src={f.thumbUrl} alt="" className="h-8 w-8 rounded object-cover" /> : <FileText size={22} className="text-text-faint" />}
            <div className="min-w-0 flex-1">
              {/* A file download, not a backend page. */}
              <a href={f.downloadUrl} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-text! hover:underline">
                {f.name}
              </a>
              <p className="text-xs text-text-faint">
                {f.size} · {f.date}
              </p>
            </div>
            <a
              href={f.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border p-1.5 text-text-muted hover:bg-surface-hover"
              title="Download"
              aria-label={`Download ${f.name}`}
            >
              <Download size={13} />
            </a>
            {canUpload && (
              <button
                type="button"
                onClick={() => window.confirm(`Delete file "${f.name}"? This cannot be undone.`) && remove.mutate(f.name)}
                disabled={remove.isPending}
                className="rounded-md border border-danger-fg/40 p-1.5 text-danger-fg hover:bg-danger-bg disabled:opacity-50"
                title="Delete"
                aria-label={`Delete ${f.name}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// expense/card.php — "Expenses Details": the report's lines, what can be done with it, its activity and
// documents, and who/when in the sidebar.
export function ExpenseCardPage() {
  const { id } = useParams<{ id: string }>()
  const { data: card, isLoading, isError, error, refetch } = useExpenseCard(id)
  const [dialog, setDialog] = useState<Dialog>(null)

  function press(action: ExpenseCardAction) {
    if (action === 'print') return setDialog({ kind: 'print' })
    if (action === 'sendEmail') return setDialog({ kind: 'email' })
    if (action === 'clone') return setDialog({ kind: 'clone' })
    if (action === 'recordPayment') return setDialog({ kind: 'pay' })
    if (action === 'modify') return
    setDialog({ kind: action })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Wallet size={20} className="text-brand" /> Expenses Details
        </h2>
        <Link to={ROUTES.expensesList} className="inline-flex items-center gap-1.5 rounded-md border border-input-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover">
          <ListChecks size={14} /> Back to List
        </Link>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading the expense…" />}
      {isError && <LegacyErrorCard title="Couldn't load this expense" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {card && id && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Receipt size={16} className="text-brand" />
                <span className="text-base font-bold text-text!">{card.ref}</span>
                <StatusBadge status={card.status} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                <span>{card.author}</span>
                <span>•</span>
                <span>{card.period}</span>
                {card.linked.map((l) => (
                  <span key={l.name} className={`inline-flex items-center gap-1 ${l.kind === 'employee' ? 'text-info-fg' : 'text-brand'}`}>
                    <span className="text-text-muted">•</span>
                    {l.kind === 'vendor' ? <Truck size={12} /> : l.kind === 'employee' ? <UserRound size={12} /> : <Building2 size={12} />}
                    {l.name}
                  </span>
                ))}
              </p>
            </div>
            <div className="flex items-baseline gap-4 text-xs text-text-muted">
              <span>
                HT: <strong className="text-text!">{card.totals.ht}</strong>
              </span>
              <span>
                VAT: <strong className="text-text!">{card.totals.vat}</strong>
              </span>
              <span className="text-base font-bold text-brand">TTC: {card.totals.ttc}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              <Card className="!h-auto !p-0 overflow-hidden">
                <h3 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-text!">
                  <Receipt size={15} className="text-brand" /> Expense Details
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                        <th className="px-4 py-2.5">Expense Type</th>
                        <th className="px-3 py-2.5">Product</th>
                        <th className="px-3 py-2.5">Project</th>
                        <th className="px-3 py-2.5">Description</th>
                        <th className="px-3 py-2.5 text-right">Unit (excl.)</th>
                        <th className="px-3 py-2.5 text-center">Qty</th>
                        <th className="px-3 py-2.5 text-right">Total TTC</th>
                        <th className="px-3 py-2.5 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {card.lines.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center italic text-text-faint">
                            No expense lines
                          </td>
                        </tr>
                      )}
                      {card.lines.map((l) => (
                        <tr key={l.id} className="border-b border-border last:border-0 align-top">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-text!">{l.label}</p>
                            <p className="text-xs text-text-faint">{l.subtitle}</p>
                          </td>
                          <td className="px-3 py-2.5 text-text-muted">{l.product}</td>
                          <td className="px-3 py-2.5 text-text-muted">{l.project}</td>
                          <td className="max-w-52 px-3 py-2.5 text-text-muted">{l.description}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-text-muted">{l.unit}</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-brand">{l.qty}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-text!">{l.total}</td>
                          <td className="px-3 py-2.5 text-center">
                            {l.receipt ? (
                              // A file download, not a backend page.
                              <a href={l.receipt.previewUrl} target="_blank" rel="noopener noreferrer" title={l.receipt.name} className="text-success-fg">
                                <Paperclip size={15} />
                              </a>
                            ) : (
                              <span className="text-text-faint">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end px-4 py-3">
                  <table className="min-w-56 text-sm">
                    <tbody>
                      <tr>
                        <td className="py-1 pr-6 text-xs text-text-muted">Subtotal:</td>
                        <td className="py-1 text-right font-semibold tabular-nums text-text!">{card.subtotal}</td>
                      </tr>
                      {card.tax && (
                        <tr>
                          <td className="py-1 pr-6 text-xs text-text-muted">Tax (VAT):</td>
                          <td className="py-1 text-right font-semibold tabular-nums text-text!">{card.tax}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-border">
                        <td className="py-1.5 pr-6 font-bold text-text!">Total:</td>
                        <td className="py-1.5 text-right font-bold tabular-nums text-brand">{card.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="flex flex-wrap gap-2">
                {card.actions.map((a) =>
                  a === 'modify' ? (
                    // The editor for a draft's header and lines is the expense report page.
                    <Link key={a} to={ROUTES.expenseReportDetail.replace(':id', id)} className={btnCls}>
                      {BUTTONS[a].icon} {BUTTONS[a].label}
                    </Link>
                  ) : (
                    <button
                      key={a}
                      type="button"
                      onClick={() => press(a)}
                      className={a === 'delete' ? 'inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700' : btnCls}
                    >
                      {BUTTONS[a].icon} {BUTTONS[a].label}
                    </button>
                  ),
                )}
              </div>

              <Card className="!h-auto !p-0 overflow-hidden">
                <h3 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-text!">
                  <History size={15} className="text-text-faint" /> Activity
                </h3>
                <div className="p-4">
                  {card.timeline.map((ev, i) => (
                    <div key={`${ev.label}-${i}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ev.color }} />
                        {i < card.timeline.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-border" />}
                      </div>
                      <div className={i < card.timeline.length - 1 ? 'pb-4' : ''}>
                        <p className="text-sm font-semibold text-text!">{ev.label}</p>
                        {ev.date && <p className="text-xs text-text-faint">{ev.date}</p>}
                        {ev.user && <p className="text-xs text-brand">by {ev.user}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <DocumentsCard id={id} canUpload />
            </div>

            <div className="min-w-0 space-y-4">
              {card.createdBy && (
                <SideCard icon={<UserRound size={15} />} title="Created By">
                  <PersonRow person={card.createdBy} size={46} />
                </SideCard>
              )}

              {card.linkedTo.length > 0 && (
                <SideCard icon={<Link2 size={15} />} title="Linked To">
                  <div className="space-y-4">
                    {card.linkedTo.map((l, i) => (
                      <div key={`${l.label}-${i}`}>
                        {l.name === l.label ? (
                          <p className="font-medium text-text!">{l.name}</p>
                        ) : (
                          <>
                            <p className="mb-1 text-xs text-text-faint">{l.label}</p>
                            <div className="flex items-center gap-3">
                              {l.label === 'Employee' && <Avatar photo={l.photo} name={l.name} size={46} />}
                              <div>
                                <p className="font-semibold text-text!">{l.name}</p>
                                {l.details.map((d) => (
                                  <p key={d} className="text-xs text-text-faint">
                                    {d}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </SideCard>
              )}

              <SideCard icon={<CalendarDays size={15} />} title="Period">
                <div className="grid grid-cols-2 gap-3">
                  {card.dates.map((d) => (
                    <div key={d.label}>
                      <p className="text-xs text-text-faint">{d.label}</p>
                      <p className="font-medium text-text!">{d.value}</p>
                    </div>
                  ))}
                </div>
              </SideCard>

              {card.validator && (
                <SideCard icon={<UserCheck size={15} />} title="Validator">
                  <PersonRow person={card.validator} size={38} />
                </SideCard>
              )}

              <SideCard icon={<CheckCircle2 size={15} />} title="Approved By">
                {card.approvedBy ? (
                  <PersonRow person={card.approvedBy} size={38} />
                ) : (
                  <p className="flex items-center gap-1.5 text-text-faint">
                    <Clock size={13} /> Not approved
                  </p>
                )}
              </SideCard>

              <SideCard icon={<CreditCard size={15} />} title="Payment Summary">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-faint">Status</span>
                    <StatusBadge status={card.payment.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-faint">Payment</span>
                    <PaidBadge paid={/^paid$/i.test(card.payment.paid)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-faint">Amount HT</span>
                    <span className="font-medium text-text!">{card.payment.ht}</span>
                  </div>
                  {card.payment.vat && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-faint">VAT</span>
                      <span className="font-medium text-text!">{card.payment.vat}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="font-bold text-text!">Total TTC</span>
                    <span className="font-bold text-brand">{card.payment.ttc}</span>
                  </div>
                </div>
              </SideCard>

              {card.notes.length > 0 && (
                <SideCard icon={<StickyNote size={15} />} title="Notes">
                  <div className="space-y-3">
                    {card.notes.map((n) => (
                      <div key={n.label}>
                        <p className="text-xs text-text-faint">{n.label}</p>
                        <p className="text-text!">{n.value}</p>
                      </div>
                    ))}
                  </div>
                </SideCard>
              )}
            </div>
          </div>

          {dialog?.kind === 'clone' && <CloneDialog id={id} card={card} onClose={() => setDialog(null)} />}
          {dialog?.kind === 'pay' && <ExpensePayDialog id={id} refLabel={card.ref} payable={amount(card.netPayable)} onClose={() => setDialog(null)} />}
          {dialog?.kind === 'email' && <SendExpenseEmailModal id={id} reportRef={card.ref} onClose={() => setDialog(null)} />}
          {dialog?.kind === 'print' && <PrintPreviewDialog url={`/expense/document.php?id=${id}`} onClose={() => setDialog(null)} />}
          {dialog && dialog.kind !== 'clone' && dialog.kind !== 'pay' && dialog.kind !== 'email' && dialog.kind !== 'print' && (
            <ConfirmDialog id={id} card={card} kind={dialog.kind} onClose={() => setDialog(null)} />
          )}
        </>
      )}
    </div>
  )
}
