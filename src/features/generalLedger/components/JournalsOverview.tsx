import { useState, type ReactNode } from 'react'
import { BookText, Loader2, AlertTriangle, FileText, Pencil, Trash2, ChevronLeft, ChevronRight, Search, X, Columns3, FileDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { ROUTES } from '../../../routes'
import { resolveLegacyRoute } from '../../../shared/legacyRoute'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { useDeleteTransaction, useExportJournals, useJournalsList, useSaveJournalColumns, useToggleReexport, type JournalsRequest } from '../journalsList.queries'
import type { JournalCell, JournalRow, JournalsList } from '../journalsListParser'
import { LedgerToolbar } from './LedgerControls'

const inputCls = 'h-8 w-full min-w-16 px-2 rounded-md border border-input-border bg-input-bg text-text text-xs outline-none focus:ring-2 focus:ring-brand/30'
const dateCls = 'h-8 w-full min-w-28 px-1.5 rounded-md border border-input-border bg-input-bg text-text text-xs outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = 'h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// How each column is aligned, and which of the page's filters sit above it.
const NUMERIC_KEYS = new Set(['t.debit', 't.credit'])
const CENTER_KEYS = new Set(['t.code_journal', 't.doc_date', 't.lettering_code', 't.date_creation', 't.tms', 't.date_export'])
type FilterSpec =
  | { kind: 'text'; name: string; extra?: 'notReconciled' }
  | { kind: 'texts'; names: [string, string]; placeholders: [string, string] }
  | { kind: 'dates'; names: [string, string] }
  | { kind: 'accounts'; names: [string, string] }
const FILTER_SPECS: Record<string, FilterSpec> = {
  't.piece_num': { kind: 'text', name: 'search_mvt_num' },
  't.code_journal': { kind: 'text', name: 'search_ledger_code' },
  't.doc_date': { kind: 'dates', names: ['search_date_start', 'search_date_end'] },
  't.doc_ref': { kind: 'text', name: 'search_doc_ref' },
  't.numero_compte': { kind: 'accounts', names: ['search_accountancy_code_start', 'search_accountancy_code_end'] },
  't.subledger_account': { kind: 'texts', names: ['search_accountancy_aux_code_start', 'search_accountancy_aux_code_end'], placeholders: ['From', 'to'] },
  't.label_operation': { kind: 'text', name: 'search_mvt_label' },
  't.debit': { kind: 'text', name: 'search_debit' },
  't.credit': { kind: 'text', name: 'search_credit' },
  't.lettering_code': { kind: 'text', name: 'search_lettering_code', extra: 'notReconciled' },
  't.date_creation': { kind: 'dates', names: ['date_creation_start', 'date_creation_end'] },
  't.tms': { kind: 'dates', names: ['date_modification_start', 'date_modification_end'] },
  't.date_export': { kind: 'dates', names: ['date_export_start', 'date_export_end'] },
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isAuthIssue = /signed in|forbidden|403/i.test(message)
  return (
    <Card className="!h-auto !bg-danger-bg border-danger/40 flex items-start gap-3">
      <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-danger-fg">Couldn't load the journals</p>
        <p className="text-xs text-danger-fg/80 mt-0.5">{message}</p>
        <div className="flex items-center gap-3 mt-2">
          <button type="button" onClick={onRetry} className="text-xs font-medium text-danger-fg underline">
            Retry
          </button>
          {isAuthIssue && (
            <Link to={ROUTES.login} className="text-xs font-medium text-danger-fg underline">
              Go to login
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}

function DocRefCell({ cell }: { cell: JournalCell }) {
  const to = resolveLegacyRoute(cell.href)
  if (!to) return <>{cell.text}</>
  return (
    <Link to={to} className="flex items-center gap-1 text-brand hover:underline">
      <FileText size={12} /> {cell.text}
    </Link>
  )
}

function ColumnCell({ colKey, cell, row }: { colKey: string; cell: JournalCell | undefined; row: JournalRow }) {
  if (!cell) return null
  if (colKey === 't.piece_num' && row.pieceNum) {
    return (
      <Link to={ROUTES.ledgerPieceDetail.replace(':pieceNum', row.pieceNum)} className="flex items-center gap-1 text-brand hover:underline">
        <FileText size={12} />
        {cell.text}
      </Link>
    )
  }
  if (colKey === 't.doc_ref') return <DocRefCell cell={cell} />
  if (colKey === 't.code_journal') return <span className="text-brand">{cell.text}</span>
  return <>{cell.text}</>
}

// The switch of the backend page: a global setting, so it is never flipped without saying so.
function ReexportSwitch({ on, busy, onChange }: { on: boolean; busy: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-muted whitespace-nowrap">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Include docs already exported"
        disabled={busy}
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-brand' : 'bg-border'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      Include Docs Already Exported
    </label>
  )
}

function ColumnPicker({ list, busy, onChange }: { list: JournalsList; busy: boolean; onChange: (keys: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const shown = list.columns.filter((c) => c.visible).map((c) => c.key)
  return (
    <div className="relative inline-block font-normal">
      <button type="button" onClick={() => setOpen((v) => !v)} title="Choose the columns to show" aria-label="Columns" className="grid h-8 w-8 place-items-center rounded-md border border-border text-text-muted hover:text-brand">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Columns3 size={14} />}
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close column list" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-border bg-surface p-2 text-left shadow-lg">
            {list.columns.map((c) => (
              <li key={c.key}>
                <label className="flex items-center gap-2 rounded px-2 py-1 text-xs text-text hover:bg-surface-hover">
                  <input
                    type="checkbox"
                    checked={c.visible}
                    // At least one column stays, as the backend would otherwise print an empty table.
                    disabled={busy || (c.visible && shown.length === 1)}
                    onChange={() => onChange(list.columns.filter((x) => (x.key === c.key ? !x.visible : x.visible)).map((x) => x.key))}
                  />
                  {c.label}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function FilterCell({ spec, values, list, onChange }: { spec: FilterSpec | undefined; values: Record<string, string>; list: JournalsList; onChange: (name: string, value: string) => void }) {
  if (!spec) return null
  const v = (name: string) => values[name] ?? ''
  if (spec.kind === 'text') {
    return (
      <div className="space-y-1">
        <input value={v(spec.name)} onChange={(e) => onChange(spec.name, e.target.value)} className={inputCls} aria-label={`Filter ${spec.name}`} />
        {spec.extra === 'notReconciled' && (
          <label className="flex items-center gap-1 whitespace-nowrap text-[11px] text-text-muted">
            <input type="checkbox" checked={v('search_not_reconciled') === 'notreconciled'} onChange={(e) => onChange('search_not_reconciled', e.target.checked ? 'notreconciled' : '')} /> Not reconciled
          </label>
        )}
      </div>
    )
  }
  if (spec.kind === 'texts') {
    return (
      <div className="space-y-1">
        {spec.names.map((name, i) => (
          <input key={name} value={v(name)} onChange={(e) => onChange(name, e.target.value)} placeholder={spec.placeholders[i]} className={inputCls} aria-label={`Filter ${name}`} />
        ))}
      </div>
    )
  }
  if (spec.kind === 'dates') {
    return (
      <div className="space-y-1">
        {spec.names.map((name, i) => (
          <input key={name} type="date" value={v(name)} onChange={(e) => onChange(name, e.target.value)} title={i === 0 ? 'From' : 'to'} className={dateCls} aria-label={`Filter ${name}`} />
        ))}
      </div>
    )
  }
  const options = [{ value: '', label: '—' }, ...list.accountOptions]
  return (
    <div className="space-y-1 min-w-44">
      {spec.names.map((name, i) => (
        <div key={name} className="flex items-center gap-1">
          <span className="w-7 shrink-0 text-[10px] font-normal text-text-faint">{i === 0 ? 'From' : 'to'}</span>
          <SearchableSelect value={v(name)} onChange={(x) => onChange(name, x)} options={options} placeholder="—" className="min-w-0 flex-1" />
        </div>
      ))}
    </div>
  )
}

// The backend's own "Operations - Journals" list (accountancy/bookkeeping/list.php): the same rows
// in the same order, paged, filtered, exported and column-picked by the backend itself.
export function JournalsOverview() {
  const [request, setRequest] = useState<JournalsRequest>({ filters: null, limit: null, page: 0 })
  // Edits of the filter row that have not been searched yet; null shows what the page reported.
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { data: list, isLoading, isFetching, isError, error, refetch } = useJournalsList(request)
  const toggleReexport = useToggleReexport()
  const deleteTransaction = useDeleteTransaction()
  const exportJournals = useExportJournals()
  const saveColumns = useSaveJournalColumns()
  const confirm = useConfirm()

  const problem = [toggleReexport, deleteTransaction, exportJournals, saveColumns].find((m) => m.isError)?.error
  const values = draft ?? list?.filters ?? {}
  const applied = (l: JournalsList) => request.filters ?? l.filters

  const go = (next: Partial<JournalsRequest>, l: JournalsList) => {
    setNotice(null)
    setRequest({ filters: applied(l), limit: request.limit, page: 0, ...next })
  }
  const search = (l: JournalsList) => go({ filters: { ...l.filters, ...values } }, l)

  const clear = (l: JournalsList) => {
    const empty = Object.fromEntries(Object.keys(l.filters).map((k) => [k, '']))
    setDraft(empty)
    go({ filters: empty }, l)
  }

  const run = async (l: JournalsList, kind: 'delete' | 'export' | 'reexport', arg?: string | boolean) => {
    setNotice(null)
    if (kind === 'delete') {
      const ok = await confirm({ title: 'Delete transaction?', message: `Delete transaction ${arg} with all of its lines from the accounting books?` })
      if (ok) deleteTransaction.mutate(String(arg), { onSuccess: () => setNotice(`Transaction ${arg} deleted.`) })
    } else if (kind === 'export') {
      const ok = await confirm({
        title: 'Export the listed lines?',
        message: 'The backend exports every line matching the current filters in its configured export format.',
        warningTitle: 'Exported lines are marked as exported.',
        warningMessage: 'Once a line has an export date it can no longer be edited or deleted.',
        variant: 'default',
        confirmLabel: 'Export',
      })
      if (ok) exportJournals.mutate(applied(l), { onSuccess: (name) => setNotice(`Exported ${name}.`) })
    } else {
      toggleReexport.mutate(Boolean(arg), { onSuccess: () => setNotice(arg ? 'Documents already exported are now included.' : 'Documents already exported are now left out.') })
    }
  }

  const visible = list?.columns.filter((c) => c.visible) ?? []
  const hasFilterCells = visible.some((c) => FILTER_SPECS[c.key])
  const set = (name: string, value: string) => setDraft({ ...(list?.filters ?? {}), ...values, [name]: value })

  let toolbarExtra: ReactNode = null
  if (list) {
    toolbarExtra = (
      <>
        <ReexportSwitch on={list.reexport} busy={toggleReexport.isPending} onChange={(next) => run(list, 'reexport', next)} />
        {list.exportTitle && (
          <button
            type="button"
            title={list.exportTitle}
            disabled={exportJournals.isPending}
            onClick={() => run(list, 'export')}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover hover:text-text! disabled:opacity-60 whitespace-nowrap"
          >
            {exportJournals.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Export
          </button>
        )}
      </>
    )
  }

  return (
    // Same sticky-header pattern as LedgerOverview.tsx/SubledgerReport.tsx —
    // the title/toolbar stick flush at main's true top and only the
    // table body scrolls internally, instead of the whole page scrolling.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <BookText size={20} className="text-brand" /> Operations - Journals
          </h2>
          {list && (
            <div className="flex items-center gap-2">
              <select value={list.limit} onChange={(e) => go({ limit: Number(e.target.value) }, list)} className={selectCls} title="Max. number of records per page" aria-label="Rows per page">
                {list.limitOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button type="button" disabled={!list.hasPrev} onClick={() => go({ page: list.page - 1 }, list)} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <span className="grid h-9 min-w-9 place-items-center rounded-md bg-brand px-2 text-sm text-white">{list.page + 1}</span>
              <button type="button" disabled={!list.hasNext} onClick={() => go({ page: list.page + 1 }, list)} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
        <LedgerToolbar active="flat" extra={toolbarExtra} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {notice && <div className="rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{notice}</div>}
        {problem && (
          <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
            {problem instanceof Error ? problem.message : 'The request was refused.'}
          </div>
        )}
        {isError && <ErrorState message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {isLoading && (
          <Card className="items-center justify-center gap-2 py-10 text-center">
            <Loader2 size={20} className="animate-spin text-brand" />
            <p className="text-sm text-text-faint">Loading the journals from the accounting backend…</p>
          </Card>
        )}

        {list && (
          <Card className={`!p-0 overflow-hidden flex-1 min-h-0 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <form
              className="flex-1 min-h-0 overflow-auto"
              onSubmit={(e) => {
                e.preventDefault()
                search(list)
              }}
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-surface">
                  {hasFilterCells && (
                    <tr className="border-b border-border align-top">
                      {visible.map((c) => (
                        <th key={c.key} className="px-2 py-1.5 font-normal">
                          <FilterCell spec={FILTER_SPECS[c.key]} values={values} list={list} onChange={set} />
                        </th>
                      ))}
                      <th className="px-2 py-1.5">
                        <span className="flex items-center gap-1">
                          <button type="submit" title="Search" className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white hover:bg-brand-hover">
                            <Search size={14} />
                          </button>
                          <button type="button" title="Remove filters" onClick={() => clear(list)} className="grid h-8 w-8 place-items-center rounded-md border border-danger/40 text-danger hover:bg-danger-bg">
                            <X size={14} />
                          </button>
                        </span>
                      </th>
                    </tr>
                  )}
                  <tr className="border-b border-border">
                    {visible.map((c) => (
                      <th key={c.key} className={`px-3 py-2.5 text-xs font-semibold text-text whitespace-nowrap ${NUMERIC_KEYS.has(c.key) ? 'text-right' : CENTER_KEYS.has(c.key) ? 'text-center' : 'text-left'}`}>
                        {c.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center">
                      <ColumnPicker list={list} busy={saveColumns.isPending} onChange={(keys) => saveColumns.mutate(keys)} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.rows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center italic text-text-faint" colSpan={visible.length + 1}>
                        No journal entries match.
                      </td>
                    </tr>
                  ) : (
                    list.rows.map((row, i) => (
                      <tr key={`${row.pieceNum}-${i}`} className="border-b border-border hover:bg-surface-hover">
                        {visible.map((c) => (
                          <td key={c.key} className={`px-3 py-2 ${NUMERIC_KEYS.has(c.key) ? 'text-right tabular-nums' : CENTER_KEYS.has(c.key) ? 'text-center whitespace-nowrap' : c.key === 't.label_operation' ? 'min-w-64' : ''} text-text!`}>
                            <ColumnCell colKey={c.key} cell={row.cells[c.key]} row={row} />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {row.canEdit && row.pieceNum && (
                              <Link to={ROUTES.ledgerPieceDetail.replace(':pieceNum', row.pieceNum)} title="Modify" className="p-1 rounded text-text-faint hover:text-brand hover:bg-brand/10">
                                <Pencil size={13} />
                              </Link>
                            )}
                            {row.canDelete && row.pieceNum && (
                              <button type="button" title="Delete" disabled={deleteTransaction.isPending} onClick={() => run(list, 'delete', row.pieceNum)} className="p-1 rounded text-text-faint hover:text-danger hover:bg-danger-bg disabled:opacity-40">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {list.rows.length > 0 && Object.keys(list.totals).length > 0 && (
                  <tfoot className="sticky bottom-0 z-10 bg-surface">
                    <tr className="bg-brand/10 font-semibold">
                      {visible.map((c, i) => (
                        <td key={c.key} className={`px-3 py-2 text-text! ${NUMERIC_KEYS.has(c.key) ? 'text-right tabular-nums' : ''}`}>
                          {i === 0 ? <span title="Total for this page">Total</span> : (list.totals[c.key] ?? '')}
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
