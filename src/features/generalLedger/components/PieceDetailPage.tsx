import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileText, ChevronRight, Home, Info, AlertTriangle, Pencil, Trash2, X, Check, LoaderCircle, Calendar, FileSignature, Tag, CalendarClock, BookOpen, ListChecks } from 'lucide-react'
import { Card, fmtZMW, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { usePieceDetail, useDeleteLedgerEntry, usePieceEditContext, useUpdatePieceField, useRowEditContext, useUpdatePieceLine, usePieceCreationDate, type PieceLine } from '../generalLedger.queries'
import { ROUTES } from '../../../routes'
import { DocLink } from './DocLink'

const disabledInputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-2 py-1.5 cursor-not-allowed'
const activeInputCls = 'text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 outline-none focus:ring-2 focus:ring-brand/30'

type EditableField = 'date' | 'journal' | 'docRef'

// Real doc_type values are lowercase snake-ish ("bank", "expense_report",
// "customer_invoice", ...) — the real page's own "Type Of Document" field
// title-cases them with spaces, reproduced here rather than hardcoding a
// lookup table for values not yet seen live.
function formatDocType(docType: string): string {
  if (!docType) return ''
  return docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// A real field box: icon + label, with the current value below. `onEdit`
// only renders the pencil for fields that actually have a real backend
// edit mechanism (Date/Journal/Accounting Doc.) — Transaction No. and Type
// Of Document don't (no setpiecenum/settype action exists on the real
// page), so those two stay plain, undecorated read-only boxes rather than
// implying an edit capability that isn't real.
function FieldBox({
  icon: Icon,
  label,
  value,
  onEdit,
  editTitle,
  children,
}: {
  icon: typeof Calendar
  label: string
  value?: string
  onEdit?: () => void
  editTitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-text-faint">
          <Icon size={13} className="text-brand" /> {label}
        </span>
        {onEdit && (
          <button type="button" onClick={onEdit} title={editTitle} className="shrink-0 w-6 h-6 rounded-md bg-brand text-white flex items-center justify-center hover:bg-brand-hover">
            <Pencil size={11} />
          </button>
        )}
      </div>
      {children ?? <p className="text-sm font-semibold text-text!">{value || '-'}</p>}
    </div>
  )
}

// Native replacement for accountancy/bookkeeping/card.php?piece_num=X —
// every journal entry's real "view source" link on this backend points at
// this exact same generic page regardless of journal type (confirmed live:
// sampled OD/BQ/ER entries, all resolved to the same URL shape), and that
// page has no JSON of its own. Every field it would show is already
// sitting in the same listbyaccount_ajax_api.php response Ledger/Journals
// fetch — see usePieceDetail's own comment — so this refetches that real
// endpoint and filters to the one piece, rather than linking out to the
// classic page.
export function PieceDetailPage() {
  const { pieceNum } = useParams<{ pieceNum: string }>()
  const { data: lines, isLoading, isError, error, refetch } = usePieceDetail(pieceNum)
  const { data: creationDate } = usePieceCreationDate(pieceNum)
  const deleteEntry = useDeleteLedgerEntry()
  const [warningDismissed, setWarningDismissed] = useState(false)

  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [dateValue, setDateValue] = useState('')
  const [journalValue, setJournalValue] = useState('')
  const [docRefValue, setDocRefValue] = useState('')
  const editContext = usePieceEditContext(pieceNum, editingField)
  const updateField = useUpdatePieceField()

  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [rowForm, setRowForm] = useState({ accountCode: '', subledgerAccount: '', subledgerLabel: '', label: '', currencyCode: '', debit: '', credit: '' })
  const rowEditContext = useRowEditContext(pieceNum, editingRowId)
  const updateLine = useUpdatePieceLine()

  function startRowEdit(l: PieceLine) {
    setEditingRowId(l.rowId)
    setRowForm({ accountCode: l.accountCode, subledgerAccount: l.subledgerAccount, subledgerLabel: '', label: l.label, currencyCode: l.currencyCode, debit: l.debit ? String(l.debit) : '0', credit: l.credit ? String(l.credit) : '0' })
  }

  function submitRowEdit() {
    if (!pieceNum || !editingRowId || !rowEditContext.data?.token) return
    updateLine.mutate(
      {
        pieceNum,
        rowId: editingRowId,
        token: rowEditContext.data.token,
        hidden: rowEditContext.data.hidden,
        fields: {
          accountingaccount_number: rowForm.accountCode,
          subledger_account: rowForm.subledgerAccount,
          subledger_label: rowForm.subledgerLabel,
          label_operation: rowForm.label,
          multicurrency_code: rowForm.currencyCode,
          debit: rowForm.debit,
          credit: rowForm.credit,
        },
      },
      { onSuccess: () => setEditingRowId(null) },
    )
  }

  function startEdit(field: EditableField, currentValue: string) {
    setEditingField(field)
    if (field === 'date') setDateValue(currentValue)
    if (field === 'journal') setJournalValue(currentValue)
    if (field === 'docRef') setDocRefValue(currentValue)
  }

  function submitEdit() {
    if (!pieceNum || !editContext.data?.token || !editingField) return
    const token = editContext.data.token
    const onSuccess = () => setEditingField(null)
    if (editingField === 'date') {
      const [yyyy, mm, dd] = dateValue.split('-')
      if (!yyyy || !mm || !dd) return
      updateField.mutate({ pieceNum, token, action: 'setdate', fields: { doc_date: `${mm}/${dd}/${yyyy}`, doc_dateday: dd, doc_datemonth: mm, doc_dateyear: yyyy } }, { onSuccess })
    } else if (editingField === 'journal') {
      updateField.mutate({ pieceNum, token, action: 'setjournal', fields: { code_journal: journalValue } }, { onSuccess })
    } else if (editingField === 'docRef') {
      updateField.mutate({ pieceNum, token, action: 'setdocref', fields: { doc_ref: docRefValue } }, { onSuccess })
    }
  }

  if (isLoading) return <LegacyLoadingCard label="Loading transaction…" />
  if (isError) return <LegacyErrorCard title="Couldn't load transaction" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const totalDebit = (lines ?? []).reduce((s, l) => s + l.debit, 0)
  const totalCredit = (lines ?? []).reduce((s, l) => s + l.credit, 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.005
  const head = lines && lines.length > 0 ? lines[0] : null

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-faint">
        <Link to={ROUTES.ledgerDashboard} className="flex items-center gap-1 hover:text-text">
          <Home size={12} /> General Ledger
        </Link>
        <ChevronRight size={11} />
        <Link to={ROUTES.ledgerList} className="hover:text-text">
          Journal
        </Link>
        <ChevronRight size={11} />
        <span className="text-text font-medium">Modify Transaction</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${ICON_STYLES.blue}`}>
            <FileText size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Modify Transaction</h2>
            <p className="text-xs text-text-faint">Update journal entry details and ledger movements</p>
          </div>
        </div>
        <Link to={ROUTES.ledgerList} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <ChevronRight size={14} className="rotate-180" /> Back to list
        </Link>
      </div>

      {!lines || lines.length === 0 ? (
        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">No lines found for piece #{pieceNum} in the real ledger data currently available.</p>
        </Card>
      ) : (
        <>
          {!isBalanced && !warningDismissed && (
            <div
              role="status"
              className="fixed top-14 right-4 z-[60] flex items-start gap-2.5 max-w-sm px-4 py-3 rounded-xl bg-warning-bg text-warning-fg shadow-lg border border-warning/40 animate-[toast-in_0.2s_ease-out_forwards]"
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-snug">
                Movement not correctly balanced. Debit = {fmtZMW(totalDebit)} | Credit = {fmtZMW(totalCredit)}
              </p>
              <button type="button" onClick={() => setWarningDismissed(true)} aria-label="Dismiss" className="shrink-0 p-0.5 rounded-md hover:bg-warning-fg/10">
                <X size={14} />
              </button>
            </div>
          )}

          <Card className="!h-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${ICON_STYLES.blue}`}>
                <FileSignature size={14} />
              </span>
              <h3 className="text-sm font-bold text-text!">Transaction Information</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3 items-stretch">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                <FieldBox icon={Tag} label="Transaction No." value={pieceNum} />

                {editingField === 'date' ? (
                  <FieldBox icon={Calendar} label="Date">
                    <div className="flex items-center gap-1.5">
                      <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className={`${activeInputCls} flex-1`} />
                      <button type="button" disabled={!editContext.data || updateField.isPending} onClick={submitEdit} title="Modify" className="p-1.5 rounded-md bg-brand text-white hover:bg-brand-hover disabled:opacity-50">
                        {updateField.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                      </button>
                      <button type="button" onClick={() => setEditingField(null)} title="Cancel" className="p-1.5 rounded-md text-text-faint hover:text-danger hover:bg-danger-bg">
                        <X size={13} />
                      </button>
                    </div>
                  </FieldBox>
                ) : (
                  <FieldBox icon={Calendar} label="Date" value={head?.date} onEdit={() => startEdit('date', head?.date ?? '')} editTitle="Edit (real: accountancy/bookkeeping/card.php?action=editdate)" />
                )}

                {editingField === 'docRef' ? (
                  <div className="sm:col-span-2">
                    <FieldBox icon={FileText} label="Accounting Document">
                      <div className="flex items-center gap-1.5">
                        <input type="text" value={docRefValue} onChange={(e) => setDocRefValue(e.target.value)} className={`${activeInputCls} flex-1`} />
                        <button type="button" disabled={!editContext.data || updateField.isPending} onClick={submitEdit} title="Modify" className="p-1.5 rounded-md bg-brand text-white hover:bg-brand-hover disabled:opacity-50">
                          {updateField.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button type="button" onClick={() => setEditingField(null)} title="Cancel" className="p-1.5 rounded-md text-text-faint hover:text-danger hover:bg-danger-bg">
                          <X size={13} />
                        </button>
                      </div>
                    </FieldBox>
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <FieldBox icon={FileText} label="Accounting Document" onEdit={() => startEdit('docRef', head?.accountingDoc ?? '')} editTitle="Edit (real: accountancy/bookkeeping/card.php?action=editdocref)">
                      <p className="text-sm font-semibold text-text!">
                        <DocLink docType={head?.docType ?? ''} fkDoc={head?.fkDoc ?? ''} docUrl={head?.docUrl ?? null} label={head?.accountingDoc ?? ''} />
                      </p>
                    </FieldBox>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                <FieldBox icon={Tag} label="Type Of Document" value={formatDocType(head?.docType ?? '')} />

                {editingField === 'journal' ? (
                  <FieldBox icon={BookOpen} label="Journal">
                    <div className="flex items-center gap-1.5">
                      {editContext.data ? (
                        <select value={journalValue} onChange={(e) => setJournalValue(e.target.value)} className={`${activeInputCls} flex-1`}>
                          {editContext.data.journalOptions.map((o) => (
                            <option key={o.code} value={o.code}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-text-faint px-2 py-1.5">
                          <LoaderCircle size={13} className="animate-spin" /> Loading…
                        </span>
                      )}
                      <button type="button" disabled={!editContext.data || updateField.isPending} onClick={submitEdit} title="Modify" className="p-1.5 rounded-md bg-brand text-white hover:bg-brand-hover disabled:opacity-50">
                        {updateField.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                      </button>
                      <button type="button" onClick={() => setEditingField(null)} title="Cancel" className="p-1.5 rounded-md text-text-faint hover:text-danger hover:bg-danger-bg">
                        <X size={13} />
                      </button>
                    </div>
                  </FieldBox>
                ) : (
                  <FieldBox icon={BookOpen} label="Journal" value={head?.journal} onEdit={() => startEdit('journal', head?.journal ?? '')} editTitle="Edit (real: accountancy/bookkeeping/card.php?action=editjournal)" />
                )}

                <div className="sm:col-span-2">
                  <FieldBox icon={CalendarClock} label="Creation Date" value={creationDate} />
                </div>
              </div>

              <div className={`rounded-lg p-4 flex flex-row lg:flex-col items-center gap-3 justify-center text-center lg:w-36 ${ICON_STYLES.blue}`}>
                <span className="shrink-0 w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center">
                  <BookOpen size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-brand">Journal</p>
                  <p className="text-[11px] text-brand/70">Journal Entry</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <div className="flex items-center gap-2 px-4 pt-4 pb-1">
              <span className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${ICON_STYLES.blue}`}>
                <ListChecks size={14} />
              </span>
              <h3 className="text-sm font-bold text-text!">List of Movements</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">#</th>
                  <th className="font-medium px-3 py-2">Account</th>
                  <th className="font-medium px-3 py-2">Subledger Account</th>
                  <th className="font-medium px-3 py-2">Label Operation</th>
                  <th className="font-medium px-3 py-2">Currency</th>
                  <th className="font-medium px-3 py-2 text-right">Debit</th>
                  <th className="font-medium px-3 py-2 text-right">Credit</th>
                  <th className="font-medium px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) =>
                  editingRowId === l.rowId ? (
                    <tr key={i} className="border-b border-border last:border-0 bg-surface/50">
                      <td className="px-3 py-2 text-text-faint text-xs">{i + 1}</td>
                      <td className="px-3 py-2">
                        {rowEditContext.data ? (
                          <select value={rowForm.accountCode} onChange={(e) => setRowForm((f) => ({ ...f, accountCode: e.target.value }))} className={activeInputCls}>
                            {rowEditContext.data.accountOptions.map((o) => (
                              <option key={o.code} value={o.code}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-text-faint px-2 py-1.5">
                            <LoaderCircle size={13} className="animate-spin" /> Loading chart of accounts…
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 space-y-1.5">
                        <input value={rowForm.subledgerAccount} onChange={(e) => setRowForm((f) => ({ ...f, subledgerAccount: e.target.value }))} placeholder="Subledger account" className={activeInputCls} />
                        <input value={rowForm.subledgerLabel} onChange={(e) => setRowForm((f) => ({ ...f, subledgerLabel: e.target.value }))} placeholder="Subledger account label" className={activeInputCls} />
                      </td>
                      <td className="px-3 py-2">
                        <input value={rowForm.label} onChange={(e) => setRowForm((f) => ({ ...f, label: e.target.value }))} className={activeInputCls} />
                      </td>
                      <td className="px-3 py-2">
                        {rowEditContext.data ? (
                          <select value={rowForm.currencyCode} onChange={(e) => setRowForm((f) => ({ ...f, currencyCode: e.target.value }))} className={activeInputCls}>
                            {rowEditContext.data.currencyOptions.map((o) => (
                              <option key={o.code} value={o.code}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-text-faint px-2 py-1.5">
                            <LoaderCircle size={13} className="animate-spin" /> Loading…
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input value={rowForm.debit} onChange={(e) => setRowForm((f) => ({ ...f, debit: e.target.value }))} className={`${activeInputCls} text-right`} />
                      </td>
                      <td className="px-3 py-2">
                        <input value={rowForm.credit} onChange={(e) => setRowForm((f) => ({ ...f, credit: e.target.value }))} className={`${activeInputCls} text-right`} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <button type="button" disabled={!rowEditContext.data || updateLine.isPending} onClick={submitRowEdit} title="Update" className="w-7 h-7 rounded-md bg-brand text-white flex items-center justify-center hover:bg-brand-hover disabled:opacity-50">
                            {updateLine.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button type="button" onClick={() => setEditingRowId(null)} title="Cancel" className="w-7 h-7 rounded-md border border-border text-text-faint flex items-center justify-center hover:text-danger hover:bg-danger-bg">
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text-faint text-xs">{i + 1}</td>
                      <td className="px-3 py-2 text-text!">
                        {l.accountCode} — {l.accountLabel}
                      </td>
                      <td className="px-3 py-2 text-text-muted">{l.subledgerAccount || '-'}</td>
                      <td className="px-3 py-2 text-text-muted">{l.label}</td>
                      <td className="px-3 py-2 text-text-muted">{l.currencyCode}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.debit ? fmtZMW(l.debit) : ''}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.credit ? fmtZMW(l.credit) : ''}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {l.canEdit && (
                            <button type="button" onClick={() => startRowEdit(l)} title="Edit this entry (real: accountancy/bookkeeping/card.php?action=update)" className="w-7 h-7 rounded-md bg-brand text-white flex items-center justify-center hover:bg-brand-hover">
                              <Pencil size={12} />
                            </button>
                          )}
                          {l.canDelete && l.deleteUrl && (
                            <button
                              type="button"
                              disabled={deleteEntry.isPending}
                              title="Delete this entry on the real accounting backend"
                              onClick={() => {
                                if (l.deleteUrl && window.confirm('Delete this accounting entry on the real backend? This cannot be undone.')) deleteEntry.mutate(l.deleteUrl)
                              }}
                              className="w-7 h-7 rounded-md bg-danger text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
                {/* Real "Add" row on the classic page (accountingaccount_number/
                    subledger_account/subledger_label/label_operation/
                    multicurrency_code/debit/credit, submit name="save"
                    value="Add") — a classic full-page-POST, no JSON create
                    endpoint, so reproduced disabled like the standalone New
                    Transaction form rather than pretending to submit. */}
                <tr className="border-b border-border bg-surface/50">
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2">
                    <select disabled className={disabledInputCls}>
                      <option>Select…</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 space-y-1.5">
                    <input disabled placeholder="Subledger account" className={disabledInputCls} />
                    <input disabled placeholder="Subledger account label" className={disabledInputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <input disabled placeholder="Label operation" className={disabledInputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <select disabled className={disabledInputCls}>
                      <option>Zambian Kwacha (ZMW)</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input disabled placeholder="0.00" className={`${disabledInputCls} text-right`} />
                  </td>
                  <td className="px-3 py-2">
                    <input disabled placeholder="0.00" className={`${disabledInputCls} text-right`} />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" disabled title="Backend page: accountancy/bookkeeping/card.php — a classic full-page-reload page, no JSON API. Disabled since there's nothing to submit to." className="rounded-md bg-neutral-bg px-3 py-1.5 text-xs font-medium text-text-faint opacity-70 cursor-not-allowed whitespace-nowrap">
                      Add
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="px-3 py-2 text-text!" colSpan={5}>
                    Total
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(totalDebit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
