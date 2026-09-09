import { useState } from 'react'
import { Package, Trash2, Eye, LoaderCircle, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { usePackingList, useUpdatePackingDeliveryStatus, useDeletePacking, DELIVERY_STATUS_LABEL, type PackingRow } from '../packingList.queries'

const COLUMNS = ['Sl.No', 'Ref.Id', 'Order Status', 'Packing Date', 'Update Delivery Status', 'Action']

function StatusSelect({ row }: { row: PackingRow }) {
  const update = useUpdatePackingDeliveryStatus()
  return (
    <div className="flex items-center gap-2">
      <select
        value={row.deliveryStatus}
        disabled={update.isPending}
        onChange={(e) => update.mutate({ packId: row.packId, deliveryStatus: Number(e.target.value) })}
        className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 disabled:opacity-50"
      >
        {Object.entries(DELIVERY_STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {update.isPending && <LoaderCircle size={14} className="animate-spin text-text-faint" />}
    </div>
  )
}

// delivery/card.php?action=pack_list ("Packing Details"). See
// packingList.queries.ts's header comment for the exact real SELECT/UPDATE/
// DELETE this reproduces. The "View" (eye) action isn't wired to anything —
// the reference page's own target (delivery/card.php?action=packing_view)
// has no React equivalent yet (no Delivery/Packing detail page exists in
// this app), so it's left disabled with a tooltip rather than linking to a
// raw PHP page.
export function PackingListPage() {
  const { data: rows, isLoading, isError, error } = usePackingList()
  const deletePacking = useDeletePacking()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function handleDelete(packId: number) {
    if (!window.confirm('Delete this packing record? This cannot be undone.')) return
    setDeletingId(packId)
    deletePacking.mutate(packId, { onSettled: () => setDeletingId(null) })
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Package size={20} className="text-brand" /> Packing Details
      </h2>

      {isError && (
        <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
          <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load packing details.'}</p>
        </Card>
      )}

      {deletePacking.isError && (
        <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
          <p className="text-sm text-danger-fg">{deletePacking.error instanceof Error ? deletePacking.error.message : 'Could not delete this packing record.'}</p>
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
                  <LoaderCircle size={16} className="inline animate-spin mr-2" /> Loading packing details…
                </td>
              </tr>
            ) : !rows || rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.packId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-muted">{i + 1}</td>
                  {/* No in-app Shipment Detail page exists yet (only list
                      views do), so this stays plain text rather than a
                      fabricated link. */}
                  <td className="px-4 py-3 text-text!">{r.ref}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success-bg text-success-fg">{r.orderStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{r.packingDate}</td>
                  <td className="px-4 py-3">
                    <StatusSelect row={r} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={deletingId === r.packId}
                        onClick={() => handleDelete(r.packId)}
                        title="Delete"
                        className="p-1.5 rounded-md text-text-faint hover:bg-danger-bg hover:text-danger-fg disabled:opacity-50"
                      >
                        {deletingId === r.packId ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                      <button type="button" disabled title="No Packing/Delivery detail page exists in this app yet" className="p-1.5 rounded-md text-text-faint opacity-40 cursor-not-allowed">
                        <Eye size={14} />
                      </button>
                    </div>
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
