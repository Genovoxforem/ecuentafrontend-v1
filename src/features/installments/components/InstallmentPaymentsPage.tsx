import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ScrollCard, STICKY_THEAD, StickyListLayout } from '../../../shared/components/layout/StickyListLayout'
import { ListPagination } from '../../../shared/components/ListPagination'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { AssetKpi, Cur, EmptyState, KpiRow, NoticeStrip, Segmented } from '../../fixedAsset/components/AssetUi'
import { GHOST_BTN, TD, TDR, TH, THR, useDebounced, useNotice } from '../../fixedAsset/assetUiHelpers'
import { fmtDate, int } from '../../fixedAsset/assetModels'
import { usePaymentList, type PaymentQuery } from '../installments.data'
import { downloadInstallmentFile, openInstallmentPdf } from '../installmentService'
import { apiFailure, planPath, receiptPath } from '../installmentHelpers'
import { FILTER_INPUT, InstallmentHeading, InstallmentSubNav, QueryStates, StatusBadge } from './InstallmentUi'

const PAGE_SIZE = 25
const STATUSES: Array<[string, string]> = [
  ['', 'All'],
  ['valid', 'Valid'],
  ['cancelled', 'Reversed / cancelled'],
]

// Installment payments and Receipts (classic installment/payments.php and receipts.php: one list, one receipt per payment), from
// installment/api/payments.php?action=list. The two pages differ only in their title and the first tile.
export function InstallmentPaymentsPage({ icon, receipts = false }: { icon: ComponentType<{ size?: number; className?: string }>; receipts?: boolean }) {
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [mode, setMode] = useState('')
  const [page, setPage] = useState(1)
  const { notice, show } = useNotice()

  const query: PaymentQuery = { q, from, to, status, mode, page, limit: PAGE_SIZE }
  const list = usePaymentList(query)
  const data = list.data
  const filtered = !!(q || from || to || status || mode)

  async function run(job: () => Promise<void>) {
    try {
      await job()
    } catch (e) {
      show(apiFailure(e), 'bad')
    }
  }

  return (
    <StickyListLayout
      header={
        <>
          <InstallmentHeading icon={icon} title={receipts ? 'Receipts' : 'Installment payments'}>
            {receipts ? 'One receipt per payment; reversed payments keep their receipt as cancelled.' : 'Every payment recorded against an installment plan.'}
          </InstallmentHeading>
          <InstallmentSubNav active={receipts ? 'receipts' : 'payments'} />
          <NoticeStrip notice={notice} />
        </>
      }
    >
      <QueryStates loading={list.isLoading} error={list.error} onRetry={() => list.refetch()} what={receipts ? 'the receipts' : 'the installment payments'} />

      {data && (
        <>
          <KpiRow>
            <AssetKpi label={receipts ? 'Receipts' : 'Payments'} value={int(data.pagination.total)} note="in this view" />
            <AssetKpi label="Collected" value={<Cur value={data.totals.collected} currency="ZMW" />} note="valid payments" tone="ok" />
          </KpiRow>

          <Card className="!h-auto !p-0 shrink-0">
            <div className="flex flex-wrap items-center gap-2 p-3">
              <Segmented
                label="Status"
                options={STATUSES}
                value={status}
                onChange={(v) => {
                  setStatus(v)
                  setPage(1)
                }}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search receipt, payment, plan, invoice, customer…"
                aria-label="Search payments"
                className={`${inputClasses} !w-80`}
              />
              <input
                type="date"
                aria-label="From"
                title="From"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setPage(1)
                }}
                className={FILTER_INPUT}
              />
              <input
                type="date"
                aria-label="To"
                title="To"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setPage(1)
                }}
                className={FILTER_INPUT}
              />
              <select
                aria-label="Method"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value)
                  setPage(1)
                }}
                className={FILTER_INPUT}
              >
                <option value="">All methods</option>
                {(data.modes ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              {data.rights.export && (
                <button type="button" onClick={() => run(() => downloadInstallmentFile('reports.php', { action: 'collection', format: 'csv' }, 'installment-collection.csv'))} className={`${GHOST_BTN} ml-auto`}>
                  <Download size={14} /> CSV
                </button>
              )}
            </div>
          </Card>

          <ScrollCard>
            {data.items.length === 0 ? (
              <EmptyState title={`No ${receipts ? 'receipt' : 'payment'}${filtered ? ' matches' : ' yet'}`}>Record payments from an installment plan.</EmptyState>
            ) : (
              <div className={list.isPlaceholderData ? 'opacity-60' : ''}>
                <table className="w-full text-sm">
                  <thead className={STICKY_THEAD}>
                    <tr className="border-b border-border bg-surface">
                      <th className={TH}>Date</th>
                      <th className={TH}>Receipt</th>
                      <th className={TH}>Payment</th>
                      <th className={TH}>Plan</th>
                      <th className={TH}>Invoice</th>
                      <th className={TH}>Customer</th>
                      <th className={TH}>Method</th>
                      <th className={TH}>Reference</th>
                      <th className={THR}>Amount</th>
                      <th className={TH}>Status</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((x) => (
                      <tr key={x.receipt_id} className="border-b border-border last:border-0">
                        <td className={`${TD} whitespace-nowrap`}>{fmtDate(x.date)}</td>
                        <td className={`${TD} font-mono font-bold`}>{x.receipt_ref}</td>
                        <td className={TD}>{x.payment_ref || '(reversed)'}</td>
                        <td className={TD}>
                          <Link to={planPath(x.plan_id)} className="text-brand hover:underline">
                            {x.plan_ref}
                          </Link>
                        </td>
                        <td className={TD}>{x.invoice_ref}</td>
                        <td className={TD}>{x.customer}</td>
                        <td className={TD}>{x.mode}</td>
                        <td className={TD}>{x.reference}</td>
                        <td className={`${TDR} font-bold`}>
                          <Cur value={x.amount} currency={x.currency} />
                        </td>
                        <td className={TD}>
                          <StatusBadge status={x.status === 'reversed' ? 'cancelled' : x.status} />
                        </td>
                        <td className={`${TD} whitespace-nowrap text-right`}>
                          {data.rights.receipt_read && (
                            <Link to={receiptPath(x.receipt_id)} className={GHOST_BTN}>
                              Receipt
                            </Link>
                          )}
                          {data.rights.receipt_write && (
                            <button type="button" className={`${GHOST_BTN} ml-1`} onClick={() => run(() => openInstallmentPdf('receipts.php', { action: 'pdf', id: x.receipt_id }))}>
                              PDF
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ScrollCard>
          <ListPagination page={data.pagination.page} perPage={data.pagination.limit} total={data.pagination.total} onPageChange={setPage} />
        </>
      )}
    </StickyListLayout>
  )
}
