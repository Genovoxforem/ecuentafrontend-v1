import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Download, Plus } from 'lucide-react'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { ROUTES } from '../../../routes'
import { AssetKpi, Cur, EmptyState, KpiRow, NoticeStrip, PageHeading, Segmented } from '../../fixedAsset/components/AssetUi'
import { GHOST_BTN, PRIMARY_BTN, TD, TDR, TH, THR, useDebounced, useNotice } from '../../fixedAsset/assetUiHelpers'
import { fmtDate, int, money } from '../../fixedAsset/assetModels'
import { useInstallmentTemplates, usePlanList, type PlanQuery } from '../installments.data'
import { downloadInstallmentFile } from '../installmentService'
import { apiFailure, payPath, planPath, invoicePath } from '../installmentHelpers'
import { FILTER_INPUT, InstallmentSubNav, Meter, QueryStates, StatusBadge } from './InstallmentUi'

const PAGE_SIZE = 25
const STATUSES: Array<[string, string]> = [
  ['', 'All'],
  ['active', 'Active'],
  ['overdue', 'Overdue'],
  ['draft', 'Draft'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
]

function SortTh({ label, sortKey, sort, dir, onSort, right }: { label: string; sortKey: string; sort: string; dir: 'asc' | 'desc'; onSort: (k: string) => void; right?: boolean }) {
  const on = sort === sortKey
  return (
    <th className={right ? THR : TH} aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-text">
        {label}
        {on && (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </button>
    </th>
  )
}

// Installment plans (classic installment/list.php): totals tiles, status tabs, the filters, the sortable list, CSV and Create. Search,
// filters, sort and paging are done by installment/api/plans.php?action=list.
export function InstallmentListPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const params = new URLSearchParams(window.location.search)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const q = useDebounced(search)
  const [status, setStatus] = useState(params.get('status') ?? '')
  const [f, setF] = useState({ due_from: '', due_to: '', from: '', to: '', template: '', currency: '' })
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('created')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const { notice, show } = useNotice()
  const templates = useInstallmentTemplates()

  const query: PlanQuery = { q, status, ...f, page, limit: PAGE_SIZE, sort, dir }
  const list = usePlanList(query)
  const data = list.data
  const filtered = !!(q || status || Object.values(f).some(Boolean))
  const setFilter = (k: keyof typeof f, v: string) => {
    setF((cur) => ({ ...cur, [k]: v }))
    setPage(1)
  }
  const onSort = (key: string) => {
    setDir(sort === key && dir === 'asc' ? 'desc' : 'asc')
    setSort(key)
  }

  async function exportCsv() {
    try {
      await downloadInstallmentFile('reports.php', { action: 'summary', format: 'csv', status: status === 'overdue' ? 'active' : status }, 'installment-summary.csv')
    } catch (e) {
      show(apiFailure(e, 'Could not export the plans.'), 'bad')
    }
  }

  const t = data?.totals
  return (
    <div className="space-y-4">
      <InBanner>
        {data?.rights.create && (
          <Link to={ROUTES.installmentNew} className={PRIMARY_BTN}>
            <Plus size={14} /> Create installment
          </Link>
        )}
      </InBanner>
      <PageHeading icon={icon} title="Installment plans">
        Every installment plan with its progress, next due date and status.
      </PageHeading>
      <InstallmentSubNav active="list" />
      <NoticeStrip notice={notice} />
      <QueryStates loading={list.isLoading} error={list.error} onRetry={() => list.refetch()} what="the installment plans" />

      {data && t && (
        <>
          <KpiRow>
            <AssetKpi label="Plans" value={int(data.pagination.total)} note="in this view" />
            <AssetKpi label="Installment amount" value={<Cur value={t.amount} currency="ZMW" />} note="active + completed" />
            <AssetKpi label="Collected" value={<Cur value={t.paid} currency="ZMW" />} note={t.amount ? `${Math.round((t.paid / t.amount) * 100)}% of scheduled` : ''} tone="ok" />
            <AssetKpi label="Outstanding" value={<Cur value={t.outstanding} currency="ZMW" />} tone={t.outstanding ? 'warn' : 'ok'} />
          </KpiRow>

          <Card className="!h-auto !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
              <Segmented
                label="Status"
                options={STATUSES}
                value={status}
                onChange={(v) => {
                  setStatus(v)
                  setPage(1)
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                {data.rights.export && (
                  <button type="button" onClick={exportCsv} className={GHOST_BTN}>
                    <Download size={14} /> CSV
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search plan, invoice, customer…"
                aria-label="Search plans"
                className={`${inputClasses} !w-64`}
              />
              <input type="date" aria-label="Due from" title="Due from" value={f.due_from} onChange={(e) => setFilter('due_from', e.target.value)} className={FILTER_INPUT} />
              <input type="date" aria-label="Due to" title="Due to" value={f.due_to} onChange={(e) => setFilter('due_to', e.target.value)} className={FILTER_INPUT} />
              <input type="date" aria-label="Created from" title="Created from" value={f.from} onChange={(e) => setFilter('from', e.target.value)} className={FILTER_INPUT} />
              <input type="date" aria-label="Created to" title="Created to" value={f.to} onChange={(e) => setFilter('to', e.target.value)} className={FILTER_INPUT} />
              <select aria-label="Plan" value={f.template} onChange={(e) => setFilter('template', e.target.value)} className={FILTER_INPUT}>
                <option value="">All plans</option>
                {(templates.data?.items ?? []).map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.label}
                  </option>
                ))}
              </select>
              <input aria-label="Currency" placeholder="Currency" value={f.currency} onChange={(e) => setFilter('currency', e.target.value.toUpperCase())} className={`${FILTER_INPUT} !w-28`} />
            </div>

            {data.items.length === 0 ? (
              <EmptyState title={`No installment plan${filtered ? ' matches' : ' yet'}`}>
                {data.rights.create && (
                  <>
                    Start with{' '}
                    <Link to={ROUTES.installmentNew} className="text-brand hover:underline">
                      Create installment
                    </Link>
                    .
                  </>
                )}
              </EmptyState>
            ) : (
              <div className={`overflow-x-auto ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <SortTh label="Plan" sortKey="ref" sort={sort} dir={dir} onSort={onSort} />
                      <th className={TH}>Invoice</th>
                      <SortTh label="Customer" sortKey="customer" sort={sort} dir={dir} onSort={onSort} />
                      <th className={THR}>Invoice amount</th>
                      <th className={THR}>Inst.</th>
                      <th className={THR}>Paid</th>
                      <SortTh label="Outstanding" sortKey="outstanding" sort={sort} dir={dir} onSort={onSort} right />
                      <SortTh label="Next due" sortKey="next_due" sort={sort} dir={dir} onSort={onSort} />
                      <th className={TH}>Progress</th>
                      <th className={TH}>Status</th>
                      <SortTh label="Created" sortKey="created" sort={sort} dir={dir} onSort={onSort} />
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className={TD}>
                          <Link to={planPath(p.id)} className="font-semibold text-brand hover:underline">
                            {p.ref}
                          </Link>
                          {p.template && <div className="text-xs text-text-muted">{p.template}</div>}
                        </td>
                        <td className={TD}>
                          <Link to={invoicePath(p.invoice_id)} className="text-brand hover:underline">
                            {p.invoice_ref}
                          </Link>
                        </td>
                        <td className={TD}>{p.customer}</td>
                        <td className={TDR}>
                          <Cur value={p.invoice_total} currency={p.currency} />
                        </td>
                        <td className={TDR}>{p.count}</td>
                        <td className={TDR}>{money(p.paid)}</td>
                        <td className={`${TDR} font-bold`}>{money(p.outstanding)}</td>
                        <td className={`${TD} whitespace-nowrap`}>{fmtDate(p.next_due)}</td>
                        <td className={TD}>
                          <Meter pct={p.progress} />
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>
                          <StatusBadge status={p.status} />
                          {p.overdue && (
                            <>
                              {' '}
                              <StatusBadge status="overdue" extra={`(${p.overdue_count})`} />
                            </>
                          )}
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>{fmtDate(p.created)}</td>
                        <td className={`${TD} whitespace-nowrap text-right`}>
                          <Link to={planPath(p.id)} className={GHOST_BTN}>
                            View
                          </Link>
                          {p.status === 'active' && data.rights.pay && (
                            <Link to={payPath(p.id)} className={`${PRIMARY_BTN} ml-1 !px-3 !py-1.5`}>
                              Pay
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <ListPagination page={data.pagination.page} perPage={data.pagination.limit} total={data.pagination.total} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
