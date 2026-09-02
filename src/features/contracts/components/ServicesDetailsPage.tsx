import { useMemo, useState } from 'react'
import { ClipboardList, Plus, X as XIcon, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useContractsSummary, useContractServices, useCreateContractService, type ContractServiceRow } from '../contracts.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const STATUS_CLS: Record<ContractServiceRow['status'], string> = {
  Planned: 'bg-info-bg text-info-fg',
  Running: 'bg-success-bg text-success-fg',
  Closed: 'bg-surface-hover text-text-muted',
}

type SortKey = 'contractRef' | 'service' | 'thirdParty' | 'plannedStart' | 'realStart' | 'plannedEnd' | 'realEnd' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Contract', key: 'contractRef' },
  { label: 'Service', key: 'service' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'Planned Start Date', key: 'plannedStart' },
  { label: 'Real Start Date', key: 'realStart' },
  { label: 'Planned End Date', key: 'plannedEnd' },
  { label: 'Real End Date', key: 'realEnd' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = ['#', ...COLUMNS.map((c) => c.label)]

function matchesSearch(s: ContractServiceRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [s.contractRef, s.service, s.thirdParty].some((field) => field.toLowerCase().includes(q))
}

function sortValue(s: ContractServiceRow, key: SortKey): string | number {
  switch (key) {
    case 'contractRef':
      return s.contractRef
    case 'service':
      return s.service
    case 'thirdParty':
      return s.thirdParty
    case 'plannedStart':
      return s.plannedStart
    case 'realStart':
      return s.realStart
    case 'plannedEnd':
      return s.plannedEnd
    case 'realEnd':
      return s.realEnd
    case 'status':
      return s.status
  }
}

// Same local-only convention as contracts.queries.ts (no backend endpoint
// for contracts/services on this app's server) — service lines recorded
// here are held in a separate local collection since ContractRow itself
// has no line-item concept.
export function ServicesDetailsPage() {
  const { data: summary } = useContractsSummary()
  const services = useContractServices()
  const createService = useCreateContractService()

  const [showForm, setShowForm] = useState(false)
  const [contractRef, setContractRef] = useState('')
  const [service, setService] = useState('')
  const [plannedStart, setPlannedStart] = useState('')
  const [realStart, setRealStart] = useState('')
  const [plannedEnd, setPlannedEnd] = useState('')
  const [realEnd, setRealEnd] = useState('')
  const [status, setStatus] = useState<ContractServiceRow['status']>('Planned')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const contracts = summary?.contracts ?? []
  const contractFor = (ref: string) => contracts.find((c) => c.ref === ref)

  const filteredServices = useMemo(() => services.filter((s) => matchesSearch(s, search)), [services, search])
  const { sorted, sort, toggleSort } = useSortableRows<ContractServiceRow, SortKey>(filteredServices, sortValue)
  const pageServices = sorted.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sorted.map((s, i) => [
      String(i + 1),
      s.contractRef,
      s.service,
      s.thirdParty,
      s.plannedStart || '-',
      s.realStart || '-',
      s.plannedEnd || '-',
      s.realEnd || '-',
      s.status,
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  function handleSave() {
    const contract = contractFor(contractRef)
    if (!contract) return setError('Contract is required.')
    if (!service.trim()) return setError('Service is required.')
    setError('')
    createService({
      contractRef,
      service,
      thirdParty: contract.thirdParty,
      plannedStart,
      realStart,
      plannedEnd,
      realEnd,
      status,
    })
    setService('')
    setPlannedStart('')
    setRealStart('')
    setPlannedEnd('')
    setRealEnd('')
    setStatus('Planned')
    setShowForm(false)
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ClipboardList size={20} className="text-brand" /> List Of Services
        </h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {showForm ? <XIcon size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Service Line'}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {showForm && (
          <Card className="!h-auto">
            {error && <p className="text-sm font-medium text-danger mb-3">{error}</p>}
            {contracts.length === 0 && <p className="text-sm text-text-faint mb-3">No contracts created yet — add one on Contract List first.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Contract</label>
                <select value={contractRef} onChange={(e) => setContractRef(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {contracts.map((c) => (
                    <option key={c.ref} value={c.ref}>
                      {c.ref} — {c.thirdParty}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Service</label>
                <input value={service} onChange={(e) => setService(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ContractServiceRow['status'])} className={selectCls}>
                  <option value="Planned">Planned</option>
                  <option value="Running">Running</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Planned Start Date</label>
                <input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Real Start Date</label>
                <input type="date" value={realStart} onChange={(e) => setRealStart(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Planned End Date</label>
                <input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Real End Date</label>
                <input type="date" value={realEnd} onChange={(e) => setRealEnd(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button type="button" onClick={handleSave} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                Save
              </button>
            </div>
          </Card>
        )}

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="List Of Services" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th>#</Th>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No services match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageServices.map((s, i) => (
                    <tr key={s.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 text-brand font-medium">{s.contractRef}</td>
                      <td className="px-4 py-3 text-text!">{s.service}</td>
                      <td className="px-4 py-3 text-text-muted">{s.thirdParty}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{s.plannedStart || '-'}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{s.realStart || '-'}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{s.plannedEnd || '-'}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{s.realEnd || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLS[s.status]}`}>{s.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredServices.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
