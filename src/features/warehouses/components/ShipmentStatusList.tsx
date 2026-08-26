import { Link } from 'react-router-dom'
import { Truck, Plus, RefreshCw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useShipmentList } from '../expedition.queries'

const COLUMNS = ['Ref.', 'Ref. Customer', 'Third-Party', 'City', 'Zip Code', 'Planned Date Of Delivery', 'Tracking Number', 'Ref Delivery', 'Date Delivery Received', 'Status']

// expedition/list.php?viewstatut=0|1|2 — real data now (see
// expedition.queries.ts / expeditionHtmlParser.ts for how the earlier
// "no shipment endpoint exists" gap was found to be wrong and fixed).
export function ShipmentStatusList({ title, viewStatut }: { title: string; viewStatut: number }) {
  const { data, isLoading, isError, error, refetch } = useShipmentList(viewStatut)

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
          <button type="button" onClick={() => refetch()} className="p-2 rounded-lg border border-input-border text-text-muted hover:bg-surface-hover" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LegacyLoadingCard label="Loading shipments…" />
      ) : isError ? (
        <LegacyErrorCard title="Couldn't load shipments" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : (
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {COLUMNS.map((c) => (
                  <th key={c} className="font-medium px-4 py-2.5 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                    No Data Available In Table
                  </td>
                </tr>
              ) : (
                (data ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    {/* Not a link yet — this app has no shipment detail
                        page/route built (expedition/card.php would be its
                        real source; out of scope for this pass, which only
                        covers the list). */}
                    <td className="px-4 py-2.5 font-medium text-text! whitespace-nowrap">{row.ref}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.refCustomer}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.thirdPartyName}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.town}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.zip}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.plannedDeliveryDate}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.trackingNumber}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.deliveryRef}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.dateDeliveryReceived}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.statusLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
