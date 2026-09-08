import { Link } from 'react-router-dom'
import { Truck, Plus, Loader2, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'
import { useShipments } from '../warehouseExtras.queries'

const COLUMNS = ['Ref.', 'Ref. Customer', 'Status', 'Date Created']

const STATUS_LABEL: Record<number, string> = { 0: 'Draft', 1: 'Validated', 2: 'Closed' }
const STATUS_CLASS: Record<number, string> = {
  0: 'bg-warning-bg text-warning-fg',
  1: 'bg-success-bg text-success-fg',
  2: 'bg-surface-hover text-text-muted',
}

// Backed by the real expedition/shipment-sidebar-list-ajax.php endpoint (see
// useShipments' own header comment) — filtered client-side by fk_statut for
// the List/Draft/Validated/Processed nav items, which are really the same
// real page's status filter (viewstatut=0/1/2) in the reference app. Only
// Ref/Customer ref/Status/Date are real fields; the reference app's
// City/Zip/Tracking/Delivery-date columns have no data source here.
export function ShipmentStatusList({ title, statusFilter }: { title: string; statusFilter?: number }) {
  const { data: shipments, isLoading, isError, error } = useShipments()
  const rows = (shipments ?? []).filter((s) => statusFilter === undefined || s.statusCode === statusFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Truck size={20} className="text-brand" /> {title}
        </h2>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.shipmentList} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Shipment
          </Link>
        </div>
      </div>

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
                <Th key={c} className="whitespace-nowrap">{c}</Th>
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
    </div>
  )
}
