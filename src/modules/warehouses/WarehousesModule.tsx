import { useWarehouseSummary } from '../../features/warehouses/warehouses.queries'
import { WarehouseOverview } from '../../features/warehouses/components/WarehouseOverview'

export function WarehousesModule() {
  const { data: summary, isError } = useWarehouseSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the warehouse dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <WarehouseOverview summary={summary} />}
    </div>
  )
}
