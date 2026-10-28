import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileStack, Plus, Search } from 'lucide-react'
import { Card, type IconColor } from '../../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useCustomerContracts, type ContractSummaryCard } from '../../customerDetailTabs.queries'
import { SectionIcon, TabTitle } from './CustomerDetailShared'

const CONTRACT_CARD_COLORS: IconColor[] = ['blue', 'green', 'amber', 'violet']

function ContractSummaryCardView({ card, color }: { card: ContractSummaryCard; color: IconColor }) {
  return (
    <Card className="!h-auto">
      <div className="flex items-center gap-2 mb-2">
        <SectionIcon icon={FileStack} color={color} />
        <h4 className="text-xs font-semibold text-text-faint uppercase tracking-wide">{card.title}</h4>
      </div>
      <div className="flex items-baseline gap-4">
        {card.items.map((it) => (
          <div key={it.label}>
            <p className="text-lg font-bold text-text!">{it.value}</p>
            <p className="text-xs text-text-faint">{it.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ContractsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerContracts(socid)
  const [refFilter, setRefFilter] = useState('')
  const [refCustomerFilter, setRefCustomerFilter] = useState('')
  const [refSupplierFilter, setRefSupplierFilter] = useState('')
  const [searchAll, setSearchAll] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({ ref: '', refCustomer: '', refSupplier: '', searchAll: '' })

  if (isLoading) return <LegacyLoadingCard label="Loading contracts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contracts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function resetFilters() {
    setRefFilter('')
    setRefCustomerFilter('')
    setRefSupplierFilter('')
    setSearchAll('')
    setAppliedFilters({ ref: '', refCustomer: '', refSupplier: '', searchAll: '' })
  }

  const filteredRows = data.rows.filter((r) => {
    const f = appliedFilters
    if (f.ref && !r.ref.toLowerCase().includes(f.ref.toLowerCase())) return false
    if (f.refCustomer && !r.ref_customer.toLowerCase().includes(f.refCustomer.toLowerCase())) return false
    if (f.refSupplier && !r.ref_supplier.toLowerCase().includes(f.refSupplier.toLowerCase())) return false
    if (f.searchAll) {
      const haystack = [r.ref, r.ref_customer, r.ref_supplier, r.sales_representatives, r.service_status].join(' ').toLowerCase()
      if (!haystack.includes(f.searchAll.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.summary.cards.map((card, i) => (
          <ContractSummaryCardView key={card.title} card={card} color={CONTRACT_CARD_COLORS[i % CONTRACT_CARD_COLORS.length]} />
        ))}
      </div>
      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Ref</label>
            <input
              type="text"
              value={refFilter}
              onChange={(e) => setRefFilter(e.target.value)}
              placeholder="Contract ref"
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Ref customer</label>
            <input
              type="text"
              value={refCustomerFilter}
              onChange={(e) => setRefCustomerFilter(e.target.value)}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Ref supplier</label>
            <input
              type="text"
              value={refSupplierFilter}
              onChange={(e) => setRefSupplierFilter(e.target.value)}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 w-40"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-text-faint">Search all</label>
            <input
              type="text"
              value={searchAll}
              onChange={(e) => setSearchAll(e.target.value)}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedFilters({ ref: refFilter, refCustomer: refCustomerFilter, refSupplier: refSupplierFilter, searchAll })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover"
          >
            <Search size={14} /> Apply
          </button>
          <button type="button" onClick={resetFilters} className="px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text">
            Reset
          </button>
        </div>
      </Card>
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <TabTitle>Contracts</TabTitle>
          <Link
            to={ROUTES.customerContractCreate.replace(':id', socid ?? '')}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> New contract
          </Link>
        </div>
        <div className="p-4 overflow-x-auto">
          {data.rows.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No contracts linked to this third party.</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No contracts match this filter.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Ref</th>
                  <th className="font-medium py-2 pr-3">Date</th>
                  <th className="font-medium py-2 pr-3">Sales reps</th>
                  <th className="font-medium py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.ref} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 font-medium text-text!">{r.ref}</td>
                    <td className="py-2 pr-3 text-text-muted">{r.date_contract}</td>
                    <td className="py-2 pr-3 text-text-muted">{r.sales_representatives}</td>
                    <td className="py-2 text-text-muted">{r.service_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
