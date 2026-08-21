import { useMemo, useState } from 'react'
import { FileBarChart2, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useContractsSummary, type ContractRow } from '../contracts.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

function statusOf(c: ContractRow): 'Not Running' | 'In Progress' | 'Expired' | 'Closed' {
  if (c.closed) return 'Closed'
  if (c.expired) return 'Expired'
  if (c.inProgress) return 'In Progress'
  return 'Not Running'
}

const STATUS_CLS: Record<string, string> = {
  'Not Running': 'bg-surface-hover text-text-muted',
  'In Progress': 'bg-info-bg text-info-fg',
  Expired: 'bg-danger-bg text-danger-fg',
  Closed: 'bg-success-bg text-success-fg',
}

function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: 'brand' | 'danger' | 'warning' | 'success' | 'violet' }) {
  const toneCls = {
    brand: 'bg-brand text-white',
    danger: 'bg-danger text-white',
    warning: 'bg-warning text-white',
    success: 'bg-success text-white',
    violet: 'bg-violet-500 text-white',
  }[tone ?? 'brand']
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-3 py-2.5">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={`inline-flex items-center justify-center min-w-8 h-6 px-2 rounded text-xs font-bold ${toneCls}`}>{value}</span>
    </div>
  )
}

// Reads the same real (if session-local) contracts collection Contract
// List already uses — see contracts.queries.ts — just summarized as a
// stat-heavy report view instead of a plain table. Fields the legacy
// report tracks that ContractRow has no equivalent for (Review Completed,
// Re-scheduled, Not Yet Completed, Missed Comments, Sales By
// Price-Category/Product) are shown honestly as zero rather than guessed.
export function ContractReportPage() {
  const { data: summary } = useContractsSummary()
  const [thirdPartyFilter, setThirdPartyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const contracts = useMemo(() => summary?.contracts ?? [], [summary])
  const thirdParties = useMemo(() => Array.from(new Set(contracts.map((c) => c.thirdParty))).sort(), [contracts])

  const filtered = useMemo(
    () => contracts.filter((c) => (!thirdPartyFilter || c.thirdParty === thirdPartyFilter) && (!statusFilter || statusOf(c) === statusFilter)),
    [contracts, thirdPartyFilter, statusFilter],
  )

  const totalCustomers = thirdParties.length
  const notRunning = contracts.filter((c) => statusOf(c) === 'Not Running').length
  const inProgress = contracts.filter((c) => statusOf(c) === 'In Progress').length
  const expired = contracts.filter((c) => statusOf(c) === 'Expired').length
  const closed = contracts.filter((c) => statusOf(c) === 'Closed').length

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileBarChart2 size={20} className="text-brand" /> List Of Contracts
      </h2>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-faint mb-1">Third Party</label>
            <select value={thirdPartyFilter} onChange={(e) => setThirdPartyFilter(e.target.value)} className={selectCls}>
              <option value="">Select a third party</option>
              {thirdParties.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="">Select a status</option>
              <option value="Not Running">Not Running</option>
              <option value="In Progress">In Progress</option>
              <option value="Expired">Expired</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Sales representatives</label>
            <select className={selectCls} disabled>
              <option>Select a users</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Technical representatives</label>
            <select className={selectCls} disabled>
              <option>Select a users</option>
            </select>
          </div>
          <button type="button" className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Search size={14} /> Search
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <StatTile label="Total Contracts" value={contracts.length} tone="success" />
        <StatTile label="Total Customers" value={totalCustomers} tone="brand" />
        <StatTile label="Total Commands" value={0} tone="success" />
        <StatTile label="Not Running Contract" value={notRunning} tone="danger" />
        <StatTile label="In Progress Contracts" value={inProgress} tone="brand" />
        <StatTile label="Expired Contracts" value={expired} tone="warning" />
        <StatTile label="Closed Contracts" value={closed} tone="violet" />
        <StatTile label="Review Completed" value={0} tone="brand" />
        <StatTile label="Re-scheduled" value={0} tone="warning" />
        <StatTile label="Not Yet Completed" value={0} tone="danger" />
        <StatTile label="Missed Comments" value={0} tone="violet" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-3 py-2.5">
          <span className="text-sm text-text-muted">Contract Sales By Price Category</span>
          <span className="inline-flex items-center justify-center px-2 h-6 rounded text-xs font-bold bg-violet-500 text-white">0.00 ZMW</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-3 py-2.5">
          <span className="text-sm text-text-muted">Contract Sales By Product</span>
          <span className="inline-flex items-center justify-center px-2 h-6 rounded text-xs font-bold bg-brand text-white">0</span>
        </div>
      </div>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Ref.</th>
              <th className="font-medium px-4 py-2.5">Third-Party</th>
              <th className="font-medium px-4 py-2.5">Sales Representatives Of Third Party</th>
              <th className="font-medium px-4 py-2.5">Contract Date</th>
              <th className="font-medium px-4 py-2.5">End Date Of Active Services</th>
              <th className="font-medium px-4 py-2.5">Created By</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-text-faint italic">
                  {contracts.length === 0 ? 'No Data Available In Table' : 'No contracts match these filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 text-brand font-medium">{c.ref}</td>
                  <td className="px-4 py-3 text-text!">{c.thirdParty}</td>
                  <td className="px-4 py-3 text-text-muted">{c.salesRep}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{c.contractDate}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{c.endDateOfServices || '-'}</td>
                  <td className="px-4 py-3 text-text-muted">{c.salesRep}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLS[statusOf(c)]}`}>{statusOf(c)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
