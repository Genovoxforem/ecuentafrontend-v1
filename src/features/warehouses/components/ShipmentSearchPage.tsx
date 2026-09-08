import { useMemo, useState } from 'react'
import { Truck, Search, Loader2, AlertTriangle, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { useShipments } from '../warehouseExtras.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

const COLUMNS = ['Ref.', 'Ref. Customer', 'Status', 'Date Created']

const STATUS_LABEL: Record<number, string> = { 0: 'Draft', 1: 'Validated', 2: 'Closed' }
const STATUS_CLASS: Record<number, string> = {
  0: 'bg-warning-bg text-warning-fg',
  1: 'bg-success-bg text-success-fg',
  2: 'bg-surface-hover text-text-muted',
}

// expedition/shipment-sidebar-list-ajax.php is real (see useShipments' own
// header comment), but it only exposes ref/customer-ref/status/date — no
// sales-order-to-shipment pipeline endpoint was found, so "Yet To Create
// Shipment" (which the reference app drives from unshipped sales orders) has
// no confirmed real data source yet and stays honestly disabled rather than
// showing a fake list.
export function ShipmentSearchPage() {
  const { data: shipments, isLoading, isError, error } = useShipments()
  const [tab, setTab] = useState<'pending' | 'created'>('created')
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const all = shipments ?? []
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter((s) => s.ref.toLowerCase().includes(q) || (s.customerRef ?? '').toLowerCase().includes(q))
  }, [shipments, search])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Truck size={20} className="text-brand" /> Shipment
      </h2>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === 'pending' ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'}`}
        >
          Yet To Create Shipment
        </button>
        <button
          type="button"
          onClick={() => setTab('created')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === 'created' ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'}`}
        >
          Shipment Created List
        </button>
      </div>

      {tab === 'pending' ? (
        <Card className="flex items-start gap-3">
          <Info size={18} className="text-text-faint shrink-0 mt-0.5" />
          <p className="text-sm text-text-muted">
            This list would show sales orders awaiting a shipment. No such endpoint is confirmed on this backend yet, so it's disabled rather than shown with fake data.
          </p>
        </Card>
      ) : (
        <>
          <Card className="!h-auto">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs text-text-faint mb-1">Search Ref. / Customer Ref.</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. SH2606-0002" className={inputCls + ' w-full pl-8'} />
                </div>
              </div>
            </div>
          </Card>

          {isError && (
            <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
              <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
              <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load shipments.'}</p>
            </Card>
          )}

          <Card className="!p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((c) => (
                    <Th key={c}>{c}</Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin mr-2" /> Loading shipments…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  rows.map((s) => (
                    <tr key={s.id} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-3 py-2 text-text!">{s.ref}</td>
                      <td className="px-3 py-2 text-text-muted">{s.customerRef ?? '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[s.statusCode] ?? 'bg-surface-hover text-text-muted'}`}>
                          {STATUS_LABEL[s.statusCode] ?? `Status ${s.statusCode}`}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.dateCreation}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
