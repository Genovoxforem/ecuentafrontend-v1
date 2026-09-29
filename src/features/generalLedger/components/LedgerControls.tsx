import { type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Search, X as XIcon, Loader2, Plus, ChevronLeft, ChevronRight, Rows3, ListTree, Layers } from 'lucide-react'
import { ROUTES } from '../../../routes'
import type { LedgerFilters } from '../generalLedger.queries'
import type { LedgerMeta } from '../ledgerHtmlParser'

// The real page's own "View Flat List" / "Group By General Ledger Account" /
// "Group By Subledger Account" buttons are three separate legacy pages
// (list.php / listbyaccount.php / listbysubaccount.php) — mirrored here as
// three separate real routes rather than one page silently switching modes,
// matching both the legacy structure and this app's own pre-existing route
// reservations (ledgerList/ledgerDashboard/ledgerSubledger).
export function LedgerToolbar({ active, extra }: { active: 'flat' | 'account' | 'subledger'; extra?: ReactNode }) {
  const pill = (key: typeof active) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
      active === key ? 'bg-brand text-white' : 'bg-surface-alt text-text-muted border border-border hover:bg-surface-hover hover:text-text!'
    }`
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link to={ROUTES.ledgerList} className={pill('flat')}>
        <Rows3 size={14} /> View Flat List
      </Link>
      <Link to={ROUTES.ledgerDashboard} className={pill('account')}>
        <Layers size={14} /> Group By General Ledger Account
      </Link>
      <Link to={ROUTES.ledgerSubledger} className={pill('subledger')}>
        <ListTree size={14} /> Group By Subledger Account
      </Link>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {extra}
        <Link to={ROUTES.ledgerCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover whitespace-nowrap">
          <Plus size={14} /> New Transaction
        </Link>
      </div>
    </div>
  )
}

const fieldCls = 'w-full max-w-[160px] text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5'
const labelCls = 'flex flex-col gap-1 text-xs font-medium text-text-faint whitespace-nowrap'

const SORT_FIELDS: { value: LedgerFilters['sortField']; label: string }[] = [
  { value: 't.doc_date', label: 'Doc Date' },
  { value: 't.piece_num', label: 'Num. Transaction' },
  { value: 't.code_journal', label: 'Journal' },
  { value: 't.debit', label: 'Debit' },
  { value: 't.credit', label: 'Credit' },
]

// The real filter row, minus the two fields that turned out not to be real
// on this backend when checked live (see generalLedger.queries.ts's own
// comment — every field kept here was individually confirmed to actually
// change meta.total_records, not just accepted silently).
export function LedgerFilterBar({
  draft,
  onChange,
  onSubmit,
  onClear,
  submitting,
}: {
  draft: LedgerFilters
  onChange: (next: LedgerFilters) => void
  onSubmit: () => void
  onClear: () => void
  submitting: boolean
}) {
  return (
    <form
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        onSubmit()
      }}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
    >
      <label className={labelCls}>
        Start date
        <input type="date" value={draft.dateStart} onChange={(e) => onChange({ ...draft, dateStart: e.target.value })} className={fieldCls} />
      </label>
      <label className={labelCls}>
        End date
        <input type="date" value={draft.dateEnd} onChange={(e) => onChange({ ...draft, dateEnd: e.target.value })} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Accounting account
        <input type="text" placeholder="401, 570…" value={draft.accountCode} onChange={(e) => onChange({ ...draft, accountCode: e.target.value })} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Accounting Doc.
        <input type="text" placeholder="INV…" value={draft.docRef} onChange={(e) => onChange({ ...draft, docRef: e.target.value })} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Journal
        <input type="text" placeholder="OD, BQ…" value={draft.journal} onChange={(e) => onChange({ ...draft, journal: e.target.value })} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Num. transaction
        <input type="text" value={draft.mvtNum} onChange={(e) => onChange({ ...draft, mvtNum: e.target.value })} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Label
        <input type="text" value={draft.label} onChange={(e) => onChange({ ...draft, label: e.target.value })} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Debit
        <input type="text" placeholder="e.g. 100 or >100" value={draft.debit} onChange={(e) => onChange({ ...draft, debit: e.target.value })} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Credit
        <input type="text" placeholder="e.g. 100 or >100" value={draft.credit} onChange={(e) => onChange({ ...draft, credit: e.target.value })} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Lettering code
        <input type="text" value={draft.letteringCode} onChange={(e) => onChange({ ...draft, letteringCode: e.target.value })} className={fieldCls} />
      </label>
      <label className={`${labelCls} justify-end`}>
        <span className="flex items-center gap-1.5 text-text-muted">
          <input type="checkbox" checked={draft.notReconciled} onChange={(e) => onChange({ ...draft, notReconciled: e.target.checked })} />
          Not reconciled
        </span>
      </label>
      <label className={labelCls}>
        Sort Field
        <select value={draft.sortField} onChange={(e) => onChange({ ...draft, sortField: e.target.value as LedgerFilters['sortField'] })} className={fieldCls}>
          {SORT_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelCls}>
        Direction
        <select value={draft.sortOrder} onChange={(e) => onChange({ ...draft, sortOrder: e.target.value as LedgerFilters['sortOrder'] })} className={fieldCls}>
          <option value="ASC">ASC</option>
          <option value="DESC">DESC</option>
        </select>
      </label>
      <label className={labelCls}>
        Per page
        <select value={draft.limit} onChange={(e) => onChange({ ...draft, limit: Number(e.target.value), page: 0 })} className={fieldCls}>
          {[25, 50, 100, 250].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" disabled={submitting} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Search
        </button>
        <button type="button" onClick={onClear} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover">
          <XIcon size={14} /> Reset
        </button>
      </div>
    </form>
  )
}

// Real pagination straight off the API's own meta block — see
// generalLedger.queries.ts. "Total: X | Returned: Y" matches the legacy
// page's own counter exactly.
export function LedgerPagination({ meta, onPage }: { meta: LedgerMeta; onPage: (page: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-border bg-surface text-xs text-text-faint">
      <span>
        Total: <b className="text-text!">{meta.totalRecords}</b> | Returned: <b className="text-text!">{meta.returnedRows}</b>
        {meta.totalPages > 1 && (
          <>
            {' '}
            · Page <b className="text-text!">{meta.page + 1}</b> of <b className="text-text!">{meta.totalPages}</b>
          </>
        )}
      </span>
      {meta.totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={meta.prevPage === null}
            onClick={() => meta.prevPage !== null && onPage(meta.prevPage)}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <button
            type="button"
            disabled={!meta.hasMore || meta.nextPage === null}
            onClick={() => meta.nextPage !== null && onPage(meta.nextPage)}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
