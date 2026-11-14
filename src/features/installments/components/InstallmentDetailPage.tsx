import { Fragment, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { AssetKpi, Badge, Banner, Cur, EmptyState, FormDialog, KpiRow, NoticeStrip, PageHeading } from '../../fixedAsset/components/AssetUi'
import { DANGER_BTN, DANGER_GHOST_BTN, GHOST_BTN, PRIMARY_BTN, TD, TDR, TH, THR, ledgerPiecePath, useNotice } from '../../fixedAsset/assetUiHelpers'
import { fmtDate, money } from '../../fixedAsset/assetModels'
import { ROUTES } from '../../../routes'
import { useDeletePlan, usePlanAction, usePlanDetail, useReversePayment } from '../installments.data'
import { openInstallmentPdf } from '../installmentService'
import { apiFailure, invoicePath, payPath, receiptPath } from '../installmentHelpers'
import { Meter, QueryStates, StatusBadge } from './InstallmentUi'

const TABS: Array<[string, string]> = [
  ['overview', 'Overview'],
  ['schedule', 'Schedule'],
  ['payments', 'Payments'],
  ['receipts', 'Receipts'],
  ['ledger', 'Accounting ledger'],
  ['history', 'History'],
  ['notes', 'Notes'],
]

// One installment plan (classic installment/details.php): KPI tiles, the actions (record payment, validate, delete draft, cancel, print) and the
// seven tabs, from installment/api/plans.php?action=get&id=. Every write is one of the classic page's own actions.
export function InstallmentDetailPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const id = Number(useParams().id)
  const [sp, setSp] = useSearchParams()
  const tab = TABS.some(([k]) => k === sp.get('tab')) ? (sp.get('tab') as string) : 'overview'
  const navigate = useNavigate()
  const q = usePlanDetail(id)
  const act = usePlanAction(id)
  const del = useDeletePlan()
  const reverse = useReversePayment()
  const { notice, show } = useNotice()
  const [dialog, setDialog] = useState<'cancel' | 'delete' | { reverse: number } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const d = q.data

  async function run(job: () => Promise<unknown>, ok: string) {
    try {
      await job()
      show(ok)
    } catch (e) {
      show(apiFailure(e), 'bad')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeading
        icon={icon}
        title={d ? d.plan.ref : 'Installment plan'}
        action={
          d && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={d.plan.status} />
              {d.plan.counts.overdue > 0 && <StatusBadge status="overdue" extra={`(${d.plan.counts.overdue})`} />}
            </div>
          )
        }
      >
        {d ? `${d.invoice.customer} · invoice ${d.invoice.ref}` : ''}
      </PageHeading>
      <NoticeStrip notice={notice} />
      <QueryStates loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} what="the installment plan" />

      {d && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <Link to={ROUTES.installmentList} className={GHOST_BTN}>
              <ArrowLeft size={14} /> All plans
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {d.plan.status === 'active' && d.rights.pay && (
                <Link to={payPath(d.plan.id)} className={PRIMARY_BTN}>
                  Record payment
                </Link>
              )}
              {d.plan.status === 'draft' && d.rights.edit && (
                <button type="button" className={PRIMARY_BTN} disabled={act.isPending} onClick={() => run(() => act.mutateAsync({ action: 'validate' }), 'Plan validated.')}>
                  Validate plan
                </button>
              )}
              {d.plan.status === 'draft' && d.rights.delete && (
                <button type="button" className={DANGER_GHOST_BTN} onClick={() => setDialog('delete')}>
                  Delete draft
                </button>
              )}
              {(d.plan.status === 'active' || d.plan.status === 'draft') && !d.plan.has_payments && d.rights.cancel && (
                <button type="button" className={DANGER_BTN} onClick={() => setDialog('cancel')}>
                  Cancel plan
                </button>
              )}
              <Link to={invoicePath(d.invoice.id)} className={GHOST_BTN}>
                View invoice
              </Link>
              <button type="button" className={GHOST_BTN} onClick={() => window.print()}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          {d.invoice.unallocated_payments > 0.004 && (
            <Banner tone="warn">
              {money(d.invoice.unallocated_payments)} {d.plan.currency} was paid on invoice {d.invoice.ref} outside this plan; it reduces the invoice balance but is not allocated to installments.
            </Banner>
          )}

          <KpiRow>
            <AssetKpi label="Invoice total" value={<Cur value={d.plan.invoice_total} currency={d.plan.currency} />} note={d.plan.paid_before ? `incl. ${money(d.plan.paid_before)} paid before the plan` : ''} />
            <AssetKpi label="Installment total" value={<Cur value={d.plan.total} currency={d.plan.currency} />} note={`${d.plan.count} installment(s)`} />
            <AssetKpi label="Paid" value={<Cur value={d.plan.paid} currency={d.plan.currency} />} note={`${d.plan.counts.paid} completed`} tone="ok" />
            <AssetKpi
              label="Outstanding"
              value={<Cur value={d.plan.outstanding} currency={d.plan.currency} />}
              note={`${d.plan.counts.pending + d.plan.counts.partial} pending · ${d.plan.counts.overdue} overdue`}
              tone={d.plan.counts.overdue ? 'bad' : d.plan.outstanding ? 'warn' : 'ok'}
            />
            <Card className="!h-auto">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-faint">Progress</p>
              <p className="mt-1 text-2xl font-bold text-text!">{d.plan.progress}%</p>
              <Meter pct={d.plan.progress} />
              <p className="text-xs text-text-muted">next due {fmtDate(d.plan.next_due) || '—'}</p>
            </Card>
          </KpiRow>

          <nav aria-label="Plan sections" className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-alt p-1.5 print:hidden">
            {TABS.map(([key, label]) => {
              const n = key === 'schedule' ? d.schedule.length : key === 'payments' ? d.payments.length : null
              return (
                <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => setSp({ tab: key })} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === key ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'}`}>
                  {label}
                  {n !== null ? ` (${n})` : ''}
                </button>
              )
            })}
          </nav>

          {tab === 'overview' && <Overview d={d} />}
          {tab === 'schedule' && (
            <Card className="!h-auto !p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className={TH}>#</th>
                      <th className={TH}>Reference</th>
                      <th className={TH}>Description</th>
                      <th className={TH}>Due</th>
                      <th className={THR}>%</th>
                      <th className={THR}>Amount</th>
                      <th className={THR}>Principal</th>
                      <th className={THR}>Interest</th>
                      <th className={THR}>Paid</th>
                      <th className={THR}>Outstanding</th>
                      <th className={TH}>Status</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {d.schedule.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className={TD}>{s.num}</td>
                        <td className={`${TD} font-mono`}>{s.ref}</td>
                        <td className={TD}>{s.label}</td>
                        <td className={`${TD} whitespace-nowrap`}>{fmtDate(s.due_date)}</td>
                        <td className={TDR}>{Math.round(s.percent * 100) / 100}</td>
                        <td className={TDR}>{money(s.amount)}</td>
                        <td className={TDR}>{money(s.principal)}</td>
                        <td className={TDR}>{money(s.interest)}</td>
                        <td className={TDR}>{money(s.paid)}</td>
                        <td className={`${TDR} font-bold`}>{money(s.outstanding)}</td>
                        <td className={TD}>
                          <StatusBadge status={s.status} />
                        </td>
                        <td className={`${TD} text-right`}>
                          {s.outstanding > 0 && d.plan.status === 'active' && d.rights.pay && (
                            <Link to={payPath(d.plan.id, s.id)} className={GHOST_BTN}>
                              Pay
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-surface font-bold">
                      <td className={`${TDR}`} colSpan={5}>
                        Total ({d.plan.currency})
                      </td>
                      <td className={TDR}>{money(d.plan.total)}</td>
                      <td className={TDR}>{money(d.plan.principal)}</td>
                      <td className={TDR}>{money(d.plan.interest)}</td>
                      <td className={TDR}>{money(d.plan.paid)}</td>
                      <td className={TDR}>{money(d.plan.outstanding)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
          {tab === 'payments' && (
            <Card className="!h-auto !p-0">
              {d.payments.length === 0 ? (
                <EmptyState title="No payments yet">
                  {d.plan.status === 'active' && d.rights.pay && (
                    <Link to={payPath(d.plan.id)} className="text-brand hover:underline">
                      Record the first payment
                    </Link>
                  )}
                </EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        <th className={TH}>Date</th>
                        <th className={TH}>Payment</th>
                        <th className={TH}>Method / account</th>
                        <th className={TH}>Reference</th>
                        <th className={TH}>Allocated to</th>
                        <th className={THR}>Amount</th>
                        <th className={TH}>Status</th>
                        <th className={TH} />
                      </tr>
                    </thead>
                    <tbody>
                      {d.payments.map((x) => (
                        <tr key={x.payment_id} className="border-b border-border last:border-0">
                          <td className={`${TD} whitespace-nowrap`}>{fmtDate(x.date)}</td>
                          <td className={`${TD} font-bold`}>{x.ref || `#${x.payment_id}`}</td>
                          <td className={TD}>
                            {x.mode}
                            <div className="text-xs text-text-muted">{x.bank}</div>
                          </td>
                          <td className={TD}>{x.reference}</td>
                          <td className={TD}>
                            {x.allocations.map((a, i) => (
                              <div key={i}>{`#${a.installment}: ${money(a.amount)}`}</div>
                            ))}
                          </td>
                          <td className={`${TDR} font-bold`}>{money(x.amount)}</td>
                          <td className={TD}>
                            <StatusBadge status={x.status} />
                          </td>
                          <td className={`${TD} whitespace-nowrap text-right`}>
                            {x.receipt_id && d.rights.receipt_read && (
                              <Link to={receiptPath(x.receipt_id)} className={GHOST_BTN}>
                                Receipt
                              </Link>
                            )}
                            {x.status === 'valid' && d.rights.pay && (
                              <button type="button" className={`${DANGER_GHOST_BTN} ml-1`} onClick={() => setDialog({ reverse: x.payment_id })}>
                                Reverse
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
          {tab === 'receipts' && (
            <Card className="!h-auto !p-0">
              {d.payments.filter((x) => x.receipt_id).length === 0 ? (
                <EmptyState title="No receipts yet">Every payment gets its own receipt.</EmptyState>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className={TH}>Receipt</th>
                      <th className={TH}>Date</th>
                      <th className={TH}>Payment</th>
                      <th className={THR}>Amount</th>
                      <th className={TH}>Status</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {d.payments
                      .filter((x) => x.receipt_id)
                      .map((x) => (
                        <tr key={x.payment_id} className="border-b border-border last:border-0">
                          <td className={`${TD} font-mono font-bold`}>{x.receipt_ref}</td>
                          <td className={TD}>{fmtDate(x.date)}</td>
                          <td className={TD}>{x.ref}</td>
                          <td className={TDR}>{money(x.amount)}</td>
                          <td className={TD}>
                            <StatusBadge status={x.receipt_status === 'cancelled' ? 'cancelled' : 'valid'} />
                          </td>
                          <td className={`${TD} text-right`}>
                            <Link to={receiptPath(x.receipt_id as number)} className={GHOST_BTN}>
                              View
                            </Link>
                            {d.rights.receipt_write && (
                              <button type="button" className={`${GHOST_BTN} ml-1`} onClick={() => run(() => openInstallmentPdf('receipts.php', { action: 'pdf', id: x.receipt_id as number }), 'PDF opened.')}>
                                PDF
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
          {tab === 'ledger' && <Ledger d={d} />}
          {tab === 'history' && (
            <Card className="!h-auto !p-0">
              {d.history.length === 0 ? (
                <EmptyState title="No history" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className={TH}>When</th>
                      <th className={TH}>Action</th>
                      <th className={TH}>Detail</th>
                      <th className={TH}>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.history.map((h, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className={`${TD} whitespace-nowrap`}>{h.date}</td>
                        <td className={TD}>
                          <Badge tone="info">{h.action.replace('_', ' ')}</Badge>
                        </td>
                        <td className={TD} title={h.previous ? `before: ${JSON.stringify(h.previous).slice(0, 400)}` : undefined}>
                          {h.label}
                        </td>
                        <td className={TD}>{h.user ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
          {tab === 'notes' && (
            <Card className="!h-auto">
              <textarea
                aria-label="Notes"
                className="min-h-36 w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text"
                readOnly={!d.rights.edit}
                value={note ?? d.plan.note}
                onChange={(e) => setNote(e.target.value)}
              />
              {d.rights.edit && (
                <div className="mt-3 text-right">
                  <button type="button" className={PRIMARY_BTN} disabled={act.isPending || note === null} onClick={() => run(() => act.mutateAsync({ action: 'note', body: { note } }), 'Notes saved.')}>
                    Save notes
                  </button>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {d && dialog === 'cancel' && (
        <FormDialog
          title={`Cancel ${d.plan.ref}`}
          items={[{ key: 'reason', label: 'Reason', required: true, full: true }]}
          initial={{}}
          okLabel="Cancel plan"
          danger
          intro="The schedule is kept for the record; the invoice becomes free for a new plan. Plans with payments must have them reversed first."
          onSave={async (v) => {
            await act.mutateAsync({ action: 'cancel', body: v })
            show('Plan cancelled.')
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {d && dialog === 'delete' && (
        <FormDialog
          title={`Delete draft ${d.plan.ref}?`}
          items={[]}
          initial={{}}
          okLabel="Delete"
          danger
          intro="The draft plan and its schedule are removed. The invoice is not changed."
          onSave={async () => {
            await del.mutateAsync(d.plan.id)
            navigate(ROUTES.installmentList)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {d && dialog && typeof dialog === 'object' && (
        <FormDialog
          title="Reverse payment?"
          items={[{ key: 'reason', label: 'Reason (kept in the history)', required: true, full: true }]}
          initial={{}}
          okLabel="Reverse payment"
          danger
          intro="The payment and its bank line are removed through the standard payment engine; the invoice is reopened if needed. The receipt stays on file as cancelled. Payments already reconciled or transferred to the ledger are refused."
          onSave={async (v) => {
            await reverse.mutateAsync({ payment_id: dialog.reverse, reason: v.reason })
            show('Payment reversed.')
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

function Overview({ d }: { d: NonNullable<ReturnType<typeof usePlanDetail>['data']> }) {
  const { plan: p, invoice: inv } = d
  const events = [
    { date: p.created, text: `Plan ${p.ref} created`, tone: 'info' as const },
    ...d.payments.map((x) => ({ date: x.date, text: `Payment ${x.ref} — ${money(x.amount)} ${p.currency}${x.status === 'reversed' ? ' (reversed)' : ''}`, tone: x.status === 'reversed' ? ('bad' as const) : ('ok' as const) })),
    ...d.schedule
      .filter((x) => x.outstanding > 0)
      .slice(0, 3)
      .map((x) => ({ date: x.due_date, text: `Due: ${x.ref} — ${money(x.outstanding)}`, tone: x.status === 'overdue' ? ('bad' as const) : ('warn' as const) })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const rows: Array<[string, ReactNode]> = [
    ['Customer', <Fragment>{inv.customer}{inv.tpin ? <span className="text-text-muted"> TPIN {inv.tpin}</span> : null}</Fragment>],
    ['Invoice', <><Link to={invoicePath(inv.id)} className="text-brand hover:underline">{inv.ref}</Link> · {fmtDate(inv.date)}</>],
    ['Invoice balance now', <Cur value={inv.state.remain} currency={inv.state.currency} />],
    ['Principal', <Cur value={p.principal} currency={p.currency} />],
    ['Interest', p.interest ? <>{Math.round(p.interest_rate * 100) / 100}% = <Cur value={p.interest} currency={p.currency} /></> : 'None'],
    ['Plan template', p.template || 'Custom'],
    ['Frequency', p.frequency],
    ['Grace period', `${p.grace_days} day(s)`],
    ['Currency', p.currency],
    ['Created', fmtDate(p.created)],
    ['Installments', `${p.counts.paid} paid · ${p.counts.partial} partial · ${p.counts.pending} pending · ${p.counts.overdue} overdue`],
  ]
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="!h-auto !p-0">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-border last:border-0">
                <td className="w-44 px-4 py-2.5 text-text-muted">{k}</td>
                <td className="px-4 py-2.5 text-text">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="!h-auto">
        <p className="font-bold text-text!">Timeline</p>
        <ul className="mt-2">
          {events.map((e, i) => (
            <li key={i} className="flex gap-3 border-b border-border py-1.5 last:border-0">
              <Badge tone={e.tone}>{fmtDate(e.date)}</Badge>
              <span className="text-sm text-text">{e.text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Ledger({ d }: { d: NonNullable<ReturnType<typeof usePlanDetail>['data']> }) {
  if (d.ledger === null)
    return (
      <Card className="!h-auto">
        <EmptyState title="No access">The “view installment accounting ledger” right is required.</EmptyState>
      </Card>
    )
  const dr = d.ledger.reduce((s, l) => s + l.debit, 0)
  const cr = d.ledger.reduce((s, l) => s + l.credit, 0)
  const pending = d.payments.some((x) => x.status === 'valid') && !d.ledger.some((l) => l.type === 'bank')
  return (
    <div className="space-y-3">
      <Banner>
        The invoice is posted by the <b>sales journal</b>; each installment payment is posted by the <b>bank journal</b> (Dr bank / Cr customer receivable) when you transfer it. This module never writes ledger lines itself.
        {pending ? ' Some payments are not transferred yet — run the Bank journal.' : ''}
      </Banner>
      <Card className="!h-auto !p-0">
        {d.ledger.length === 0 ? (
          <EmptyState title="Nothing in the ledger yet">Transfer the Sales and Bank journals in the Accounting Workspace.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className={TH}>Date</th>
                  <th className={TH}>Piece</th>
                  <th className={TH}>Journal</th>
                  <th className={TH}>Source</th>
                  <th className={TH}>Account</th>
                  <th className={TH}>Label</th>
                  <th className={THR}>Debit</th>
                  <th className={THR}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {d.ledger.map((l, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className={`${TD} whitespace-nowrap`}>{fmtDate(l.date)}</td>
                    <td className={TD}>
                      <Link to={ledgerPiecePath(l.piece_num)} className="text-brand hover:underline">
                        #{l.piece_num}
                      </Link>
                    </td>
                    <td className={TD}>{l.journal}</td>
                    <td className={TD}>{l.type === 'bank' ? 'Payment' : 'Invoice'}</td>
                    <td className={`${TD} font-mono`}>
                      {l.account} <span className="text-text-muted">{l.account_label}</span>
                    </td>
                    <td className={TD}>{l.label}</td>
                    <td className={TDR}>{l.debit ? money(l.debit) : ''}</td>
                    <td className={TDR}>{l.credit ? money(l.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface font-bold">
                  <td className={TDR} colSpan={6}>
                    Total
                  </td>
                  <td className={TDR}>{money(dr)}</td>
                  <td className={TDR}>{money(cr)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
