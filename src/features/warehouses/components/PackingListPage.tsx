import { useState } from 'react'
import { Package, Plus, Trash2, Eye, LoaderCircle, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { usePackingList, useUpdatePackingDeliveryStatus, useDeletePacking, useCreatePacking, DELIVERY_STATUS_LABEL, type PackingRow } from '../packingList.queries'
import { useShipments } from '../warehouseExtras.queries'
import { PackingDetailModal } from './PackingDetailModal'

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
  const confirm = useConfirm()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [openPackId, setOpenPackId] = useState<number | null>(null)
  const [newShipment, setNewShipment] = useState('')
  const createPacking = useCreatePacking()
  const shipments = useShipments()
  // A shipment that already has a packing record cannot be given a second one.
  const packedShipmentIds = new Set((rows ?? []).map((r) => String(r.shipmentId)))
  const freeShipments = (shipments.data ?? []).filter((s) => !packedShipmentIds.has(String(s.id)))
  const openRow = rows?.find((r) => r.packId === openPackId) ?? null

  async function handleDelete(packId: number) {
    if (!(await confirm({ title: 'Delete Packing Record?', message: 'Are you sure you want to delete this packing record?' }))) return
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

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-text-faint">
            Open a packing record for a shipment
            <select value={newShipment} onChange={(e) => setNewShipment(e.target.value)} className="mt-1 block h-9 w-64 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text">
              <option value="">{shipments.isLoading ? 'Loading shipments…' : 'Choose a shipment…'}</option>
              {freeShipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ref}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!newShipment || createPacking.isPending}
            onClick={() => createPacking.mutate(Number(newShipment), { onSuccess: () => setNewShipment('') })}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createPacking.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />} Create
          </button>
        </div>
        {createPacking.isError && <p role="alert" className="mt-2 text-sm text-danger">{createPacking.error instanceof Error ? createPacking.error.message : 'Could not create the packing record.'}</p>}
      </Card>

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
                      <button type="button" onClick={() => setOpenPackId(r.packId)} title="Packers and printable packing list" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand">
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
      {openRow && <PackingDetailModal row={openRow} onClose={() => setOpenPackId(null)} />}
    </div>
  )
}
