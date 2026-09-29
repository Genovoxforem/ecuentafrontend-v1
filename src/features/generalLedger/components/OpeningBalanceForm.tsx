import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, Loader2, Plus, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useOpeningBalance, useValidateOpeningBalance } from '../openingBalance.queries'
import type { OpeningBalanceForm as OpeningBalanceData } from '../openingBalanceParser'

const inputCls = 'h-10 w-full rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const th = 'px-3 py-2.5 text-left text-xs font-bold text-text'

interface Row {
  key: number
  account: string
  debit: string
  credit: string
}

// Digits with one decimal point (the page's own boxes only take digits).
const cleanAmount = (raw: string) => {
  const [whole, ...rest] = raw.replace(/[^\d.]/g, '').split('.')
  return rest.length ? `${whole}.${rest.join('')}` : whole
}
const num = (text: string) => Number(text) || 0
const round4 = (n: number) => Math.round(n * 10000) / 10000
const show = (n: number) => (n ? n.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '')

function OpeningBalanceEditor({ form }: { form: OpeningBalanceData }) {
  const confirm = useConfirm()
  const validate = useValidateOpeningBalance()
  const [date, setDate] = useState('')
  const [rows, setRows] = useState<Row[]>([{ key: 0, account: '', debit: '', credit: '' }])
  const [nextKey, setNextKey] = useState(1)
  const [problem, setProblem] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)

  const options = useMemo(() => [...form.accounts].sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true })), [form.accounts])

  const total = useMemo(() => {
    const debit = round4(rows.reduce((s, r) => s + num(r.debit), 0))
    const credit = round4(rows.reduce((s, r) => s + num(r.credit), 0))
    // The adjustment account takes whichever side is short.
    return { debit, credit, adjDebit: credit > debit ? round4(credit - debit) : 0, adjCredit: debit > credit ? round4(debit - credit) : 0, all: Math.max(debit, credit) }
  }, [rows])

  // Editing anything clears the last message, which was about the previous try.
  const patch = (key: number, change: Partial<Row>) => {
    setProblem(null)
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...change } : r)))
  }

  const submit = async () => {
    setProblem(null)
    setDone(null)
    if (!date) return setProblem('Choose the migration date.')
    const used = rows.filter((r) => r.account || num(r.debit) || num(r.credit))
    if (used.length === 0 || !used[0].account) return setProblem('At least one accounting value is needed for the ledger.')
    for (const r of used) {
      if (!r.account) return setProblem('Choose an account for every line that has an amount.')
      if (!num(r.debit) && !num(r.credit)) return setProblem('Enter a debit or a credit for every account line.')
      if (num(r.debit) && num(r.credit)) return setProblem('A line cannot have both a debit and a credit.')
    }
    const lines = used.map((r) => ({ account: r.account, debit: num(r.debit) ? String(num(r.debit)) : '', credit: num(r.credit) ? String(num(r.credit)) : '' }))
    // The page always posts its adjustment line; with nothing to adjust it would be a zero row.
    if (total.adjDebit || total.adjCredit) lines.push({ account: form.adjustment.account, debit: total.adjDebit ? String(total.adjDebit) : '', credit: total.adjCredit ? String(total.adjCredit) : '' })

    const ok = await confirm({
      title: 'Validate the opening balance?',
      message: `Write ${lines.length} line${lines.length === 1 ? '' : 's'} to the ledger dated ${date}, as one transaction "Opening Balance".`,
      warningTitle: 'This writes to the accounting books.',
      warningMessage: 'The lines are recorded at once; correct them afterwards from the Journals list.',
      variant: 'default',
      confirmLabel: 'Validate Transaction',
    })
    if (!ok) return
    validate.mutate(
      { date, lines },
      {
        onSuccess: () => {
          setDone(lines.length)
          setRows([{ key: nextKey, account: '', debit: '', credit: '' }])
          setNextKey((k) => k + 1)
          setDate('')
        },
        onError: (e) => setProblem(e instanceof Error ? e.message : 'The request was refused.'),
      },
    )
  }

  const currency = form.currency ? ` (${form.currency})` : ''

  return (
    <div className="space-y-4">
      {done !== null && (
        <div className="rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">
          Opening balance validated successfully — {done} line{done === 1 ? '' : 's'} written.{' '}
          <Link to={ROUTES.ledgerList} className="underline">
            View in Journals
          </Link>
        </div>
      )}
      {problem && (
        <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {problem}
        </div>
      )}

      <Card className="!h-auto space-y-5">
        <label className="flex flex-wrap items-center gap-3 text-sm text-text">
          <span className="font-medium">Migration Date :</span>
          <input type="date" value={date} onChange={(e) => {
              setProblem(null)
              setDate(e.target.value)
            }} className="h-10 w-56 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30" aria-label="Migration date" />
        </label>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Accounts</th>
                <th className={`${th} w-56`}>Debit{currency}</th>
                <th className={`${th} w-56`}>Credit{currency}</th>
                <th className={`${th} w-24`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key} className="border-b border-border align-middle">
                  <td className="min-w-72 px-2 py-2">
                    <SearchableSelect value={r.account} onChange={(account) => patch(r.key, { account })} options={options} placeholder="Select Account" />
                  </td>
                  <td className="px-2 py-2">
                    {/* A row has a debit or a credit, never both — typing in one clears the other, as the page does. */}
                    <input value={r.debit} onChange={(e) => patch(r.key, { debit: cleanAmount(e.target.value), credit: '' })} inputMode="decimal" className={`${inputCls} text-right`} aria-label={`Debit line ${i + 1}`} />
                  </td>
                  <td className="px-2 py-2">
                    <input value={r.credit} onChange={(e) => patch(r.key, { credit: cleanAmount(e.target.value), debit: '' })} inputMode="decimal" className={`${inputCls} text-right`} aria-label={`Credit line ${i + 1}`} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      {i === rows.length - 1 && (
                        <button
                          type="button"
                          title="Add a line"
                          aria-label="Add a line"
                          onClick={() => {
                            setRows((cur) => [...cur, { key: nextKey, account: '', debit: '', credit: '' }])
                            setNextKey((k) => k + 1)
                          }}
                          className="grid h-8 w-8 place-items-center rounded-md text-brand hover:bg-brand/10"
                        >
                          <Plus size={15} />
                        </button>
                      )}
                      {rows.length > 1 && (
                        <button type="button" title="Remove this line" aria-label={`Remove line ${i + 1}`} onClick={() => setRows((cur) => cur.filter((x) => x.key !== r.key))} className="grid h-8 w-8 place-items-center rounded-md text-danger hover:bg-danger-bg">
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b border-border">
                <th className={th}>Total</th>
                <th className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-text">{show(total.debit)}</th>
                <th className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-text">{show(total.credit)}</th>
                <th />
              </tr>
              <tr className="border-b border-border align-middle">
                <td className="px-3 py-3 text-sm font-semibold text-text">
                  {form.adjustment.label}
                  <div className="text-xs font-normal text-text-muted">{form.adjustment.note}</div>
                </td>
                <td className="px-2 py-2">
                  <input value={show(total.adjDebit)} readOnly className={`${inputCls} text-right`} aria-label="Adjustment debit" />
                </td>
                <td className="px-2 py-2">
                  <input value={show(total.adjCredit)} readOnly className={`${inputCls} text-right`} aria-label="Adjustment credit" />
                </td>
                <td />
              </tr>
              <tr>
                <th className={th}>
                  TOTAL AMOUNT
                  <div className="text-xs font-normal text-text-muted">(Includes Opening Balance Adjustment account.)</div>
                </th>
                <th className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-text">{show(total.all)}</th>
                <th className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-text">{show(total.all)}</th>
                <th />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-center">
          <button type="button" onClick={submit} disabled={validate.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            {validate.isPending && <Loader2 size={14} className="animate-spin" />} Validate Transaction
          </button>
        </div>
      </Card>
    </div>
  )
}

// The backend's own "Opening Balances" page (accountancy/admin/openingbalance.php).
export function OpeningBalanceForm() {
  const { data: form, isLoading, isError, error, refetch } = useOpeningBalance()
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Landmark size={20} className="text-brand" /> Opening Balances
      </h2>
      {isLoading && <LegacyLoadingCard label="Loading the opening balance form…" />}
      {isError && <LegacyErrorCard title="Couldn't load the opening balance form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {form && <OpeningBalanceEditor form={form} />}
    </div>
  )
}
