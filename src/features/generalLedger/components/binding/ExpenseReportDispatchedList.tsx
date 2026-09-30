import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Link2, Loader2, Pencil, X } from 'lucide-react'
import { Avatar } from '../../../../shared/components/Avatar'
import { StickyListLayout, ScrollCard, STICKY_THEAD } from '../../../../shared/components/layout/StickyListLayout'
import { SearchableSelect } from '../../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { ROUTES } from '../../../../routes'
import { EXPENSE_LINES_PATH, useBoundExpenseLines, useRebindLines } from '../../boundLines.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'font-semibold px-2 py-2.5 text-left text-xs text-text'

// accountancy/expensereport/lines.php — the real "Bound lines of expense
// reports" screen (see boundExpenseLinesParser.ts). "Change the binding"
// re-points the ticked lines (or one line via its pencil) at another
// accounting account with the page's own POST.
export function ExpenseReportDispatchedList() {
  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(0)
  const { data, isLoading, isFetching, isError, error, refetch } = useBoundExpenseLines(limit, page)
  const rebind = useRebindLines(EXPENSE_LINES_PATH)
  const confirm = useConfirm()
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState('')
  const [editing, setEditing] = useState<{ lineId: string; account: string } | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const accountOptions = useMemo(() => (data?.accounts ?? []).map((a) => ({ value: a.value, label: a.label })), [data])
  const labelOf = (v: string) => accountOptions.find((o) => o.value === v)?.label ?? v

  if (isLoading) return <LegacyLoadingCard label="Loading bound lines…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the bound lines" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const goTo = (p: number) => {
    setPage(p)
    setTicked(new Set())
    setEditing(null)
    setResult(null)
  }
  const showValidation = data.rows.some((r) => r.validationDate)
  const colCount = showValidation ? 10 : 9
  const allTicked = data.rows.length > 0 && data.rows.every((r) => ticked.has(r.lineId))
  const toggle = (id: string) =>
    setTicked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const apply = async (lineIds: string[], account: string) => {
    setResult(null)
    const ok = await confirm({
      title: 'Change the binding?',
      message: `Re-bind ${lineIds.length} expense report line(s) to "${labelOf(account)}"?`,
      warningTitle: 'This changes the accounting account of these lines.',
      warningMessage: 'It affects future accounting transfers of these expense lines.',
      variant: 'default',
      confirmLabel: 'Change binding',
    })
    if (!ok) return
    rebind.mutate(
      { token: data.token, limit, page, lineIds, account },
      {
        onSuccess: (msg) => {
          setResult(msg || `${lineIds.length} line(s) updated.`)
          setTicked(new Set())
          setEditing(null)
          setTarget('')
        },
      },
    )
  }

  return (
    <StickyListLayout
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Link2 size={20} className="text-brand" /> Bound Lines Of Expense Reports
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                goTo(0)
              }}
              className={selectCls}
              title="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {data.pageCount > 1 && (
              <>
                <button type="button" disabled={page === 0} onClick={() => goTo(page - 1)} className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40">
                  <ChevronLeft size={16} />
                </button>
                <span className="grid h-9 min-w-9 place-items-center rounded-md bg-brand px-2 text-sm text-white">{page + 1}</span>
                <span className="text-sm text-text-faint">/ {data.pageCount}</span>
                <button
                  type="button"
                  disabled={page + 1 >= data.pageCount}
                  onClick={() => goTo(page + 1)}
                  className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      }
    >
      {data.info && <div className="rounded-lg border border-info/40 bg-info-bg/50 px-4 py-3 text-sm text-info-fg">{data.info}</div>}
      {result && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{result}</div>}
      {rebind.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {rebind.error instanceof Error ? rebind.error.message : 'Changing the binding failed.'}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-text">Change the product/service accounting account for selected lines with the following accounting account:</span>
        <div className="w-72">
          <SearchableSelect value={target} onChange={setTarget} options={accountOptions} placeholder="Select account" />
        </div>
        <button
          type="button"
          disabled={ticked.size === 0 || target === '' || rebind.isPending}
          onClick={() => apply([...ticked], target)}
          className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40"
        >
          {rebind.isPending && <Loader2 size={14} className="animate-spin" />} Change the binding
        </button>
      </div>

      <ScrollCard className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead className={STICKY_THEAD}>
            <tr className="border-b border-border bg-surface">
              <th className={th}>Employees</th>
              <th className={th}>Id Line</th>
              <th className={th}>Expense Report</th>
              {showValidation && <th className={th}>Validation Date</th>}
              <th className={th}>Date Of Line</th>
              <th className={th}>Types Of Fees</th>
              <th className={th}>Description</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={th}>Tax Rate</th>
              <th className={th}>Accounting Account</th>
              <th className="px-3 py-2.5">
                <input type="checkbox" checked={allTicked} onChange={() => setTicked(allTicked ? new Set() : new Set(data.rows.map((r) => r.lineId)))} aria-label="Select all" />
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={colCount + 1} className="px-3 py-8 text-center italic text-text-faint">
                  No bound expense report lines. Lines from approved or closed expense reports appear here once they are bound to an account.
                </td>
              </tr>
            )}
            {data.rows.map((r) => (
              <tr key={r.lineId} className="border-b border-border align-middle">
                <td className="px-2 py-2.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar photo={r.employeePhoto} name={r.employee} size={24} />
                    {r.employeeId ? (
                      <Link to={ROUTES.userDetail.replace(':id', r.employeeId)} className="text-brand hover:underline">
                        {r.employee}
                      </Link>
                    ) : (
                      r.employee
                    )}
                  </span>
                </td>
                <td className="px-2 py-2.5 font-medium text-text!">{r.lineId}</td>
                <td className="max-w-44 break-all px-2 py-2.5">
                  {r.reportId ? (
                    <Link to={ROUTES.expenseReportDetail.replace(':id', r.reportId)} className="text-brand hover:underline">
                      {r.reportRef}
                    </Link>
                  ) : (
                    r.reportRef
                  )}
                </td>
                {showValidation && <td className="px-2 py-2.5 whitespace-nowrap text-text-muted">{r.validationDate}</td>}
                <td className="px-2 py-2.5 whitespace-nowrap text-text-muted">{r.date}</td>
                <td className="max-w-36 break-words px-2 py-2.5 text-text">{r.feeType}</td>
                <td className="px-2 py-2.5 text-text-muted max-w-36 truncate" title={r.description}>
                  {r.description}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{r.amount}</td>
                <td className="px-2 py-2.5 whitespace-nowrap text-text-muted">{r.taxRate}</td>
                <td className="px-2 py-2.5 whitespace-nowrap">
                  {editing?.lineId === r.lineId ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-52">
                        <SearchableSelect value={editing.account} onChange={(v) => setEditing({ lineId: r.lineId, account: v })} options={accountOptions} placeholder="Select account" />
                      </div>
                      <button
                        type="button"
                        disabled={editing.account === '' || rebind.isPending}
                        onClick={() => apply([r.lineId], editing.account)}
                        className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white disabled:opacity-40"
                        title="Save"
                      >
                        <Check size={15} />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="grid h-8 w-8 place-items-center rounded-md border border-border text-text-muted" title="Cancel">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-text">
                      {r.account}
                      <button type="button" onClick={() => setEditing({ lineId: r.lineId, account: '' })} title="Change account" className="text-text-faint hover:text-brand">
                        <Pencil size={13} />
                      </button>
                    </span>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <input type="checkbox" checked={ticked.has(r.lineId)} onChange={() => toggle(r.lineId)} aria-label={`Select line ${r.lineId}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollCard>
    </StickyListLayout>
  )
}
