import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileText, Link2, Loader2 } from 'lucide-react'
import { Avatar } from '../../../../shared/components/Avatar'
import { StickyListLayout, ScrollCard, STICKY_THEAD } from '../../../../shared/components/layout/StickyListLayout'
import { SearchableSelect } from '../../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { ROUTES } from '../../../../routes'
import { EXPENSE_BIND_PATH, useBindExpenseLines } from '../../bindExpenseLines.queries'
import { useBindSelectedLines } from '../../bindLines.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'font-semibold px-2 py-2.5 text-left text-xs text-text'

// accountancy/expensereport/list.php — the real "Lines of expense reports to
// bind" screen (see bindExpenseLinesParser.ts). Pick an account per line, tick
// the lines, choose "Bind" and Confirm: that posts the page's ventil mass action.
export function ExpenseReportToDispatchList() {
  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(0)
  const { data, isLoading, isFetching, isError, error, refetch } = useBindExpenseLines(limit, page)
  const bind = useBindSelectedLines(EXPENSE_BIND_PATH)
  const confirm = useConfirm()
  // null = the ticks the page itself prints (a line with a suggested account starts ticked)
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [accountFor, setAccountFor] = useState<Record<string, string>>({})
  // Bind is the page's only action, so it is what the box starts on.
  const [action, setAction] = useState('ventil')
  const [result, setResult] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const accountOptions = useMemo(() => (data?.accounts ?? []).filter((a) => a.value).map((a) => ({ value: a.value, label: a.label })), [data])

  if (isLoading) return <LegacyLoadingCard label="Loading expense report lines…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the expense report lines" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const ticked = picked ?? new Set(data.rows.filter((r) => r.checked).map((r) => r.lineId))
  const goTo = (p: number) => {
    setPage(p)
    setPicked(null)
    setAccountFor({})
    setResult(null)
  }
  const allTicked = data.rows.length > 0 && data.rows.every((r) => ticked.has(r.lineId))
  const toggle = (id: string) => {
    const next = new Set(ticked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }
  const canConfirm = action === 'ventil' && ticked.size > 0 && !bind.isPending

  const handleConfirm = async () => {
    setResult(null)
    setProblem(null)
    const selections = data.rows.filter((r) => ticked.has(r.lineId)).map((r) => ({ lineId: r.lineId, selectValue: r.selectValue, account: accountFor[r.lineId] ?? r.selectedAccount }))
    const blank = selections.find((x) => !x.account)
    if (blank) return setProblem(`Choose the accounting account for line ${blank.lineId}, or untick it.`)
    const ok = await confirm({
      title: 'Bind expense report lines?',
      message: `Bind ${selections.length} expense report line(s) to the chosen accounting accounts?`,
      warningTitle: 'This writes to the accounting bindings.',
      warningMessage: 'Bound lines leave this list and move to "Dispatched".',
      variant: 'default',
      confirmLabel: 'Bind',
    })
    if (!ok) return
    bind.mutate(
      { token: data.token, limit, page, sortfield: data.sortfield, sortorder: data.sortorder, selections },
      {
        onSuccess: (msg) => {
          setResult(msg || `${selections.length} line(s) bound.`)
          setPicked(null)
          setAccountFor({})
        },
      },
    )
  }

  return (
    <StickyListLayout
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Link2 size={20} className="text-brand" /> Lines Of Expense Reports To Bind
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select value={action} onChange={(e) => setAction(e.target.value)} className={`${selectCls} w-44`}>
              <option value="">-- Select Action --</option>
              <option value="ventil">Bind</option>
            </select>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40"
            >
              {bind.isPending && <Loader2 size={14} className="animate-spin" />} Confirm
            </button>
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
            <button
              type="button"
              disabled={page === 0}
              onClick={() => goTo(page - 1)}
              className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="grid h-9 min-w-9 place-items-center rounded-md bg-brand px-2 text-sm text-white">{page + 1}</span>
            <button
              type="button"
              disabled={data.rows.length < limit}
              onClick={() => goTo(page + 1)}
              className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      }
    >
      {data.info && <div className="rounded-lg border border-info/40 bg-info-bg/50 px-4 py-3 text-sm text-info-fg">{data.info}</div>}
      {result && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{result}</div>}
      {problem && (
        <div role="alert" className="rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {problem}
        </div>
      )}
      {bind.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {bind.error instanceof Error ? bind.error.message : 'Binding failed.'}
        </div>
      )}

      <ScrollCard className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead className={STICKY_THEAD}>
            <tr className="border-b border-border bg-surface">
              <th className={th}>Employee</th>
              <th className={th}>Id Line</th>
              <th className={th}>Expense Report</th>
              <th className={th}>Date Of Line</th>
              <th className={th}>Types Of Fees</th>
              <th className={th}>Description</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={th}>Tax Rate</th>
              <th className={th}>Accounting Account Suggested</th>
              <th className={`${th} min-w-48`}>Bind Line With The Accounting Account</th>
              <th className="px-3 py-2.5">
                <input type="checkbox" checked={allTicked} onChange={() => setPicked(allTicked ? new Set() : new Set(data.rows.map((r) => r.lineId)))} aria-label="Select all" />
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center italic text-text-faint">
                  No expense report lines left to bind.
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
                    <Link to={ROUTES.expenseReportDetail.replace(':id', r.reportId)} className="inline-flex items-center gap-1 text-brand hover:underline">
                      <FileText size={13} /> {r.reportRef}
                    </Link>
                  ) : (
                    r.reportRef
                  )}
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap text-text-muted">{r.date}</td>
                <td className="max-w-36 break-words px-2 py-2.5">{r.feeType}</td>
                <td className="px-2 py-2.5 text-text-muted max-w-36 truncate" title={r.description}>
                  {r.description}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{r.amount}</td>
                <td className="px-2 py-2.5 whitespace-nowrap text-text-muted">{r.taxRate}</td>
                <td className="px-2 py-2.5 text-xs">{r.suggestedAccount}</td>
                <td className="px-2 py-2.5">
                  <SearchableSelect
                    value={accountFor[r.lineId] ?? r.selectedAccount}
                    onChange={(v) => setAccountFor((s) => ({ ...s, [r.lineId]: v }))}
                    options={accountOptions}
                    placeholder="Select account"
                  />
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
