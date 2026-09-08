import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Trash2,
  Save,
  LoaderCircle,
  Wand2,
  Eraser,
  ScanLine,
  ChevronLeft,
  ChevronRight,
  XCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { ROUTES } from '../../../routes'
import {
  useInventoryLinesPage,
  useAddInventoryLineReal,
  useUpdateInventoryLinesReal,
  useDeleteInventoryLineReal,
  useCloseInventoryReal,
  useCancelInventoryReal,
} from '../inventoryLines.queries'

// Real "count entry" table from product/inventory/inventory.php — see
// inventoryLines.ts's own header comment for the full real action/field
// contract this is built from and what was live-verified vs. read-only.

function EmptyLinesState() {
  return (
    <div className="flex flex-col items-center gap-1.5 py-10 text-center">
      <p className="text-sm font-medium text-text-muted">No lines yet</p>
      <p className="text-xs text-text-faint">Add a warehouse and product below to start counting.</p>
    </div>
  )
}

export function InventoryCountLines({ inventoryId }: { inventoryId: string }) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useInventoryLinesPage(inventoryId, page)

  const [addWarehouse, setAddWarehouse] = useState('')
  const [addProduct, setAddProduct] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [qtyDrafts, setQtyDrafts] = useState<Record<number, string>>({})

  const addLine = useAddInventoryLineReal()
  const saveLines = useUpdateInventoryLinesReal()
  const deleteLine = useDeleteInventoryLineReal()
  const closeInventory = useCloseInventoryReal()
  const cancelInventory = useCancelInventoryReal()

  // Real Qty edits only live in this page's own #formrecord until "Save" is
  // submitted — reset the local draft whenever a fresh page of lines comes
  // in (new page number, or a refetch after add/delete/save) so drafts never
  // point at a line that no longer exists.
  useEffect(() => {
    if (!data) return
    const next: Record<number, string> = {}
    for (const line of data.lines) next[line.lineId] = line.realQty
    setQtyDrafts(next)
  }, [data])

  if (isLoading) {
    return (
      <Card className="!h-auto flex items-center justify-center py-16 text-text-faint text-sm gap-2">
        <LoaderCircle size={16} className="animate-spin" /> Loading count lines…
      </Card>
    )
  }
  if (isError || !data) {
    return (
      <Card className="!h-auto flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-sm font-medium text-danger">Couldn't load count lines</p>
        <p className="text-xs text-text-faint">{error instanceof Error ? error.message : 'Unknown error.'}</p>
        <button type="button" onClick={() => refetch()} className="text-xs font-medium text-brand hover:underline">
          Retry
        </button>
      </Card>
    )
  }

  const isDraft = data.status === 'draft'
  const isValidated = data.status === 'validated'
  const isEditable = data.canUpdateStock && (isDraft || isValidated)
  const hasDirtyQty = data.lines.some((l) => (qtyDrafts[l.lineId] ?? '') !== l.realQty)

  function handleAddLine() {
    if (!addWarehouse || !addProduct || !addQty) return
    addLine.mutate(
      { id: inventoryId, fkWarehouse: addWarehouse, fkProduct: addProduct, qty: addQty },
      { onSuccess: () => { setAddWarehouse(''); setAddProduct(''); setAddQty('1') } },
    )
  }

  function handleAutofill() {
    if (!data) return
    const next: Record<number, string> = {}
    for (const line of data.lines) next[line.lineId] = String(line.expectedQty)
    setQtyDrafts(next)
  }

  function handleClearQtys() {
    if (!data) return
    const next: Record<number, string> = {}
    for (const line of data.lines) next[line.lineId] = ''
    setQtyDrafts(next)
  }

  function handleSave() {
    if (!data) return
    saveLines.mutate({
      id: inventoryId,
      page,
      lines: data.lines.map((l) => ({ lineId: l.lineId, realQty: qtyDrafts[l.lineId] ?? l.realQty, stockQtySnapshot: l.stockQtySnapshot })),
    })
  }

  function handleDeleteLine(lineId: number) {
    if (!window.confirm('Remove this line from the count?')) return
    deleteLine.mutate({ id: inventoryId, page, lineId })
  }

  function handleClose() {
    if (
      !window.confirm(
        'Make Movements and Close will post real stock movements reconciling Expected vs. Real quantities for every line, and close this inventory. This cannot be undone. Continue?',
      )
    )
      return
    closeInventory.mutate({ id: inventoryId, page })
  }

  function handleCancel() {
    if (!window.confirm('Cancel this inventory? No stock movements will be posted, and it can no longer be edited.')) return
    cancelInventory.mutate(inventoryId)
  }

  const mutationError =
    (addLine.isError && addLine.error) ||
    (saveLines.isError && saveLines.error) ||
    (deleteLine.isError && deleteLine.error) ||
    (closeInventory.isError && closeInventory.error) ||
    (cancelInventory.isError && cancelInventory.error)

  return (
    <div className="space-y-4">
      {isValidated && (
        <Card className="!h-auto !p-0 overflow-hidden border-brand/30">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-brand/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-text!">
              <CheckCircle2 size={16} className="text-brand" /> Make Movements and Close
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={cancelInventory.isPending}
                onClick={handleCancel}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50"
              >
                {cancelInventory.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />} Cancel
              </button>
              <button
                type="button"
                disabled={closeInventory.isPending}
                onClick={handleClose}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {closeInventory.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Make Movements and Close
              </button>
            </div>
          </div>
          <p className="flex items-start gap-1.5 px-4 py-2 text-xs text-text-faint border-t border-border">
            <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
            Posts a real stock movement for every line where Real Qty differs from Expected Qty, then closes this inventory. Save any pending Real Qty edits first.
          </p>
        </Card>
      )}

      {mutationError && (
        <p className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
          {mutationError instanceof Error ? mutationError.message : 'The legacy backend rejected this action.'}
        </p>
      )}

      {isEditable && (
        <Card className="!h-auto !p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="block text-xs font-medium text-text-faint mb-1">Warehouse</label>
              <SearchableSelect value={addWarehouse} onChange={setAddWarehouse} options={data.warehouseOptions} placeholder="Select warehouse…" />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="block text-xs font-medium text-text-faint mb-1">Product</label>
              <SearchableSelect value={addProduct} onChange={setAddProduct} options={data.productOptions} placeholder="Select product…" />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-text-faint mb-1">Qty</label>
              <input
                type="number"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <button
              type="button"
              disabled={!addWarehouse || !addProduct || !addQty || addLine.isPending}
              onClick={handleAddLine}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {addLine.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />} Add
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
            <button
              type="button"
              title="Requires the barcode-scanning workflow (searchfrombarcode.php) — a much larger real feature, not built here yet. Use the classic page for scanning."
              disabled
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-faint opacity-50 cursor-not-allowed"
            >
              <ScanLine size={13} /> Update by scanning
            </button>
            <button
              type="button"
              onClick={handleAutofill}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover"
            >
              <Wand2 size={13} /> Autofill With Expected
            </button>
            <button
              type="button"
              onClick={handleClearQtys}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover"
            >
              <Eraser size={13} /> Clear Qtys
            </button>
          </div>
        </Card>
      )}

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Count lines</h3>
          {isEditable && (
            <button
              type="button"
              disabled={!hasDirtyQty || saveLines.isPending}
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {saveLines.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          )}
        </div>

        {data.lines.length === 0 ? (
          <EmptyLinesState />
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-950">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pl-4 pr-3">Warehouse</th>
                  <th className="font-medium py-2 pr-3">Product</th>
                  <th className="font-medium py-2 pr-3 text-right">Expected Qty</th>
                  <th className="font-medium py-2 pr-3 text-right">Real Qty</th>
                  {isEditable && <th className="font-medium py-2 pr-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr key={line.lineId} className="border-b border-border last:border-0">
                    <td className="py-2 pl-4 pr-3">
                      {line.warehouseId ? (
                        <Link to={ROUTES.warehouseDetail.replace(':id', String(line.warehouseId))} className="text-brand hover:underline">
                          {line.warehouseRef}
                        </Link>
                      ) : (
                        line.warehouseRef
                      )}
                    </td>
                    <td className="py-2 pr-3 text-text!">
                      {line.productId ? (
                        <Link to={ROUTES.productDetail.replace(':id', String(line.productId))} className="text-brand hover:underline">
                          {line.productRef}
                        </Link>
                      ) : (
                        line.productRef
                      )}
                      {line.productLabel && <span className="text-text-faint"> — {line.productLabel}</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{line.expectedQty}</td>
                    <td className="py-2 pr-3 text-right">
                      {isEditable ? (
                        <input
                          type="number"
                          value={qtyDrafts[line.lineId] ?? ''}
                          onChange={(e) => setQtyDrafts((prev) => ({ ...prev, [line.lineId]: e.target.value }))}
                          className="w-24 rounded-md border border-input-border bg-input-bg px-2 py-1 text-right text-sm tabular-nums text-text focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      ) : (
                        <span className="tabular-nums text-text!">{line.realQty || '—'}</span>
                      )}
                    </td>
                    {isEditable && (
                      <td className="py-2 pr-4 text-right">
                        <button
                          type="button"
                          disabled={deleteLine.isPending}
                          onClick={() => handleDeleteLine(line.lineId)}
                          title="Remove line"
                          className="p-1.5 rounded-md text-text-faint hover:bg-danger-bg hover:text-danger-fg disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm text-text-muted">
          <span>Page {page + 1}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-md hover:bg-surface-alt disabled:opacity-40 disabled:hover:bg-transparent"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={!data.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-md hover:bg-surface-alt disabled:opacity-40 disabled:hover:bg-transparent"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>

      {!data.canUpdateStock && data.lines.length > 0 && (
        <p className="text-xs text-text-faint">This inventory is {data.status} — count lines are read-only.</p>
      )}
    </div>
  )
}
