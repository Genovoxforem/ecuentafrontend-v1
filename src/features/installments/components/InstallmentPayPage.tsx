import { useMemo, useRef, useState, type ComponentType } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { AssetKpi, Banner, Cur, EmptyState, FormDialog, KpiRow, Segmented } from '../../fixedAsset/components/AssetUi'
import { GHOST_BTN, PRIMARY_BTN, TD, TDR, TH, THR } from '../../fixedAsset/assetUiHelpers'
import { fmtDate, money, num, round2 } from '../../fixedAsset/assetModels'
import { usePaymentOptions, useRecordPayment } from '../installments.data'
import { apiFailure, planPath, receiptPath } from '../installmentHelpers'
import { InstallmentHeading, QueryStates, StatusBadge } from './InstallmentUi'

type Mode = 'auto' | 'manual'

// Record an installment payment (classic installment/payment.php): the payment form and the allocation (oldest due first, or the
// installments the user chooses), sent to installment/api/payments.php {action:'record'} with an idempotency key so a double click or a
// retry never records the payment twice.
export function InstallmentPayPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const id = Number(useParams().id)
  const pre = Number(useSearchParams()[0].get('installment')) || 0
  const q = usePaymentOptions(id)
  const o = q.data
  if (!o?.plan) return <PayShell icon={icon} q={q} id={id} />
  return <PayForm key={`${o.plan.id}-${pre}`} icon={icon} o={o} pre={pre} />
}

function PayShell({ icon, q, id }: { icon: ComponentType<{ size?: number; className?: string }>; q: ReturnType<typeof usePaymentOptions>; id: number }) {
  return (
    <div className="space-y-4">
      <InstallmentHeading icon={icon} title="Record installment payment" />
      <QueryStates loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} what="the payment form" />
      {!q.isLoading && !q.error && (
        <Card className="!h-auto">
          <EmptyState title="Plan not found">
            <Link to={planPath(id)} className="text-brand hover:underline">
              Back to the plan
            </Link>
          </EmptyState>
        </Card>
      )}
    </div>
  )
}

function PayForm({ icon, o, pre }: { icon: ComponentType<{ size?: number; className?: string }>; o: NonNullable<ReturnType<typeof usePaymentOptions>['data']>; pre: number }) {
  const p = o.plan!
  const navigate = useNavigate()
  const record = useRecordPayment()
  const key = useRef(`ip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)
  const open = useMemo(() => p.schedule.filter((s) => s.outstanding > 0), [p.schedule])
  const preRow = pre ? open.find((s) => s.id === pre) : undefined
  const [mode, setMode] = useState<Mode>(preRow ? 'manual' : 'auto')
  const [manual, setManual] = useState<Record<number, string>>(preRow ? { [preRow.id]: String(preRow.outstanding) } : {})
  const [v, setV] = useState({
    date: o.today,
    amount: String(preRow ? preRow.outstanding : (open[0]?.outstanding ?? '')),
    payment_mode_id: o.defaults.mode_id ? String(o.defaults.mode_id) : '',
    fk_account: o.defaults.bank_account ? String(o.defaults.bank_account) : '',
    num_payment: '',
    note: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState(false)
  const set = (k: keyof typeof v, val: string) => setV((cur) => ({ ...cur, [k]: val }))

  // The allocation as the classic page computes it: oldest due first takes from each open installment in turn; manual takes what is typed.
  const amount = num(v.amount)
  const plan: Record<number, number> = {}
  let left = amount
  for (const s of open) {
    if (mode === 'auto') {
      const take = Math.min(left, s.outstanding)
      plan[s.id] = take > 0 ? round2(take) : 0
      left = round2(left - take)
    } else plan[s.id] = num(manual[s.id])
  }
  const sum = Object.values(plan).reduce((a, b) => a + b, 0)
  const allocOk = Math.abs(sum - amount) < 0.005

  function validate(): boolean {
    const miss: Record<string, string> = {}
    for (const k of ['date', 'amount', 'payment_mode_id'] as const) if (!v[k]) miss[k] = 'Required'
    if (o.rules.bank_required && !v.fk_account) miss.fk_account = 'Required'
    setErrors(miss)
    setMessage('')
    if (Object.keys(miss).length) return false
    if (!allocOk) {
      setMessage('The allocation must equal the amount received.')
      return false
    }
    return true
  }

  async function submit() {
    const allocation = mode === 'auto' ? 'auto' : Object.entries(plan).filter(([, a]) => a > 0).map(([k, a]) => ({ schedule_id: Number(k), amount: a }))
    try {
      const r = await record.mutateAsync({ plan_id: p.id, allocation, idempotency_key: key.current, ...v })
      navigate(`${receiptPath(r.data.receipt_id)}?new=1`)
    } catch (e) {
      const fields = (e as { errors?: Record<string, unknown> }).errors ?? {}
      const next: Record<string, string> = {}
      for (const k of Object.keys(v)) if (fields[k]) next[k] = Array.isArray(fields[k]) ? (fields[k] as string[]).join(' ') : String(fields[k])
      setErrors(next)
      setMessage(apiFailure(e))
      setConfirm(false)
    }
  }

  const field = (k: keyof typeof v, label: string, control: React.ReactNode, hint?: string, full?: boolean) => (
    <div className={`flex flex-col gap-1 ${full ? 'col-span-full' : ''}`}>
      <label htmlFor={`pay_${k}`} className="text-sm text-text">
        {label}
      </label>
      {control}
      {(errors[k] || hint) && <span className={`text-xs ${errors[k] ? 'text-danger' : 'text-text-faint'}`}>{errors[k] || hint}</span>}
    </div>
  )

  return (
    <div className="space-y-4">
      <InstallmentHeading icon={icon} title="Record installment payment">
        {p.customer}
        {p.customer_tpin ? ` · TPIN ${p.customer_tpin}` : ''} · invoice {p.invoice_ref}
      </InstallmentHeading>
      <div>
        <Link to={planPath(p.id)} className={GHOST_BTN}>
          <ArrowLeft size={14} /> {p.ref}
        </Link>
      </div>
      <KpiRow>
        <AssetKpi label="Plan total" value={<Cur value={p.total} currency={p.currency} />} />
        <AssetKpi label="Already paid" value={<Cur value={p.paid} currency={p.currency} />} tone="ok" />
        <AssetKpi label="Outstanding" value={<Cur value={p.outstanding} currency={p.currency} />} tone="warn" />
        <AssetKpi label="Invoice balance" value={<Cur value={p.invoice_remain} currency={p.currency} />} note={p.foreign ? `rate ${p.rate}` : ''} />
      </KpiRow>
      {p.status !== 'active' && <Banner tone="bad">This plan is {p.status}; payments can only be recorded on an active plan.</Banner>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="!h-auto">
          <h3 className="mb-3 font-bold text-text!">Payment</h3>
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {field('date', 'Payment date', <input id="pay_date" type="date" className={inputClasses} value={v.date} onChange={(e) => set('date', e.target.value)} />)}
            {field('amount', `Amount received (${p.currency})`, <input id="pay_amount" inputMode="decimal" className={inputClasses} value={v.amount} onChange={(e) => set('amount', e.target.value)} />, `Max ${money(p.max_payment)}`)}
            {field(
              'payment_mode_id',
              'Payment method',
              <select id="pay_payment_mode_id" className={inputClasses} value={v.payment_mode_id} onChange={(e) => set('payment_mode_id', e.target.value)}>
                <option value="">— choose —</option>
                {o.modes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'fk_account',
              'Bank / cash account',
              <select id="pay_fk_account" className={inputClasses} value={v.fk_account} onChange={(e) => set('fk_account', e.target.value)}>
                <option value="">— choose —</option>
                {o.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{`${a.label} (${a.kind}${a.currency ? `, ${a.currency}` : ''})`}</option>
                ))}
              </select>,
            )}
            {field('num_payment', 'Payment / transaction reference', <input id="pay_num_payment" className={inputClasses} placeholder="Cheque no., mobile money or bank ref." value={v.num_payment} onChange={(e) => set('num_payment', e.target.value)} />)}
            {field('note', 'Note (printed on the receipt)', <textarea id="pay_note" rows={3} className={inputClasses} value={v.note} onChange={(e) => set('note', e.target.value)} />, undefined, true)}
          </div>
          {message && (
            <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              {message}
            </p>
          )}
          <div className="mt-4 text-right">
            <button type="button" className={PRIMARY_BTN} disabled={p.status !== 'active' || record.isPending} onClick={() => validate() && setConfirm(true)}>
              Record payment
            </button>
          </div>
        </Card>

        <Card className="!h-auto !p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <b className="text-text!">Allocation</b>
            <Segmented<Mode>
              label="Allocation"
              options={[
                ['auto', 'Oldest due first'],
                ['manual', 'Choose installments'],
              ]}
              value={mode}
              onChange={setMode}
            />
          </div>
          {open.length === 0 ? (
            <EmptyState title="Nothing outstanding" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className={TH}>#</th>
                    <th className={TH}>Installment</th>
                    <th className={TH}>Status</th>
                    <th className={THR}>Outstanding</th>
                    <th className={THR}>Allocate</th>
                    <th className={THR}>After</th>
                  </tr>
                </thead>
                <tbody>
                  {open.map((s) => {
                    const after = round2(s.outstanding - plan[s.id])
                    return (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className={TD}>{s.num}</td>
                        <td className={TD}>
                          {s.label}
                          <div className="text-xs text-text-muted">{fmtDate(s.due_date)}</div>
                        </td>
                        <td className={TD}>
                          <StatusBadge status={s.status} />
                        </td>
                        <td className={TDR}>{money(s.outstanding)}</td>
                        <td className={TDR}>
                          {mode === 'manual' ? (
                            <input aria-label={`Allocate to installment ${s.num}`} inputMode="decimal" className={`${inputClasses} !w-28 text-right`} value={manual[s.id] ?? ''} onChange={(e) => setManual((cur) => ({ ...cur, [s.id]: e.target.value }))} />
                          ) : (
                            money(plan[s.id])
                          )}
                        </td>
                        <td className={TDR}>
                          {money(after)} {after <= 0 ? <StatusBadge status="paid" /> : plan[s.id] > 0 ? <StatusBadge status="partial" /> : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-surface">
                    <td className={TDR} colSpan={4}>
                      Allocated
                    </td>
                    <td className={`${TDR} font-bold ${allocOk ? 'text-success-fg' : 'text-danger-fg'}`}>{money(sum)}</td>
                    <td className={`${TD} text-xs text-danger-fg`}>{allocOk ? '' : `must equal ${money(amount)}`}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>

      {confirm && (
        <FormDialog
          title={`Record ${money(amount)} ${p.currency}?`}
          items={[]}
          initial={{}}
          okLabel="Record payment"
          intro={`The payment is recorded on invoice ${p.invoice_ref} through the standard payment engine and its bank line is created. A receipt is issued.`}
          onSave={submit}
          onClose={() => setConfirm(false)}
        />
      )}
    </div>
  )
}
