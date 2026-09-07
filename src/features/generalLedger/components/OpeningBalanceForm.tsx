import { useMemo, useState } from 'react'
import { Landmark, Info, Plus, Trash2, Loader2, Check } from 'lucide-react'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useLocalCollection, nextLocalRef, todayIso } from '../../../shared/localCollection'
import { useChartOfAccountsTree, useSaveOpeningBalance, flattenCoaTree } from '../generalLedgerSetup.queries'

interface DraftLine {
  key: string
  accountNumber: string
  debit: string
  credit: string
}

interface SavedBatch {
  ref: string
  date: string
  lines: { accountNumber: string; accountLabel: string; debit: string; credit: string }[]
}

function newDraftLine(): DraftLine {
  return { key: nextLocalRef('line'), accountNumber: '', debit: '', credit: '' }
}

export function OpeningBalanceForm() {
  const { data: tree } = useChartOfAccountsTree()
  const accounts = useMemo(() => flattenCoaTree(tree ?? []), [tree])
  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.text.split('-')[0] ?? '', label: a.text })),
    [accounts],
  )

  const [date, setDate] = useState(todayIso())
  const [lines, setLines] = useState<DraftLine[]>([newDraftLine()])
  const [error, setError] = useState('')
  const [batches, updateBatches] = useLocalCollection<SavedBatch[]>(['generalLedger', 'openingBalanceBatches'], [])
  const saveOpeningBalance = useSaveOpeningBalance()

  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const line of lines) {
      debit += Number(line.debit) || 0
      credit += Number(line.credit) || 0
    }
    return { debit, credit, difference: debit - credit }
  }, [lines])

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((cur) => cur.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function handleSave() {
    setError('')
    const valid = lines.filter((l) => l.accountNumber && (Number(l.debit) > 0 || Number(l.credit) > 0))
    if (valid.length === 0) return setError('Add at least one account with a debit or credit amount.')

    saveOpeningBalance.mutate(
      { date, lines: valid.map((l) => ({ accountNumber: l.accountNumber, debit: l.debit, credit: l.credit })) },
      {
        onSuccess: () => {
          const labelFor = (num: string) => accounts.find((a) => a.text.startsWith(`${num}-`))?.text.split('-').slice(1).join('-') ?? ''
          updateBatches((cur) => [
            { ref: nextLocalRef('OB'), date, lines: valid.map((l) => ({ accountNumber: l.accountNumber, accountLabel: labelFor(l.accountNumber), debit: l.debit, credit: l.credit })) },
            ...cur,
          ])
          setLines([newDraftLine()])
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Save failed.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Landmark size={20} className="text-brand" /> Opening Balance
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">accountancy/admin/openingbalance.php</code>. Saving here genuinely writes real{' '}
          <code className="font-mono">llx_accounting_bookkeeping</code> rows through <code className="font-mono">openingbalance_ajax.php</code> — the same
          real write the classic page uses. There's no read API for entries already on the backend though, so the list below only reflects what's been
          entered in this browser session.
        </p>
      </Card>

      <Card className="!h-auto space-y-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-text-muted">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5" />
          </label>
        </div>

        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.key} className="flex flex-wrap items-center gap-2">
              <div className="w-72">
                <SearchableSelect value={line.accountNumber} onChange={(v) => updateLine(line.key, { accountNumber: v })} options={accountOptions} placeholder="Select account..." />
              </div>
              <input
                type="number"
                value={line.debit}
                onChange={(e) => updateLine(line.key, { debit: e.target.value, credit: e.target.value ? '' : line.credit })}
                placeholder="Debit"
                className="w-32 text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
              />
              <input
                type="number"
                value={line.credit}
                onChange={(e) => updateLine(line.key, { credit: e.target.value, debit: e.target.value ? '' : line.debit })}
                placeholder="Credit"
                className="w-32 text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
              />
              <button
                type="button"
                onClick={() => setLines((cur) => (cur.length > 1 ? cur.filter((l) => l.key !== line.key) : cur))}
                className="p-1.5 rounded-md text-danger hover:bg-danger-bg"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLines((cur) => [...cur, newDraftLine()])}
          className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
        >
          <Plus size={13} /> Add row
        </button>

        <div className="flex items-center justify-end gap-6 pt-2 border-t border-border text-sm">
          <span className="text-text-muted">
            Debit: <span className="font-semibold text-text! tabular-nums">{fmtZMW(totals.debit)}</span>
          </span>
          <span className="text-text-muted">
            Credit: <span className="font-semibold text-text! tabular-nums">{fmtZMW(totals.credit)}</span>
          </span>
          <span className={`font-semibold tabular-nums ${totals.difference === 0 ? 'text-success-fg' : 'text-danger'}`}>
            Difference: {fmtZMW(Math.abs(totals.difference))}
          </span>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveOpeningBalance.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {saveOpeningBalance.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
          </button>
        </div>
      </Card>

      {batches.length > 0 && (
        <Card className="!p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">Entered this session</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Ref</th>
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2">Account</th>
                  <th className="font-medium px-3 py-2 text-right">Debit</th>
                  <th className="font-medium px-3 py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {batches.flatMap((batch) =>
                  batch.lines.map((l, i) => (
                    <tr key={`${batch.ref}-${i}`} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text-faint">{i === 0 ? batch.ref : ''}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{i === 0 ? batch.date : ''}</td>
                      <td className="px-3 py-2 text-text!">
                        {l.accountNumber}
                        {l.accountLabel ? `-${l.accountLabel}` : ''}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.debit ? fmtZMW(Number(l.debit)) : '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.credit ? fmtZMW(Number(l.credit)) : '-'}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
