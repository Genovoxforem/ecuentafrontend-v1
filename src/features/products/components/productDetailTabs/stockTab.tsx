import { VirtualStockBreakdown } from '../VirtualStockBreakdown'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Info, History, Warehouse, AlertTriangle, Wrench, ArrowLeftRight } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../../routes'
import { formatNumber } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../LegacyReportStates'
import { useProductStockOverview, useSetStockField, useCorrectStock, useTransferStock } from '../../products.queries'
import { Th, Td, EmptyRow, Field, FieldRow, SectionHeader, ModalShell, ModalField, modalInputCls } from '../ProductDetailShared'
import { BatchTrackingButton } from './ProductDetailTabsShared'

// Editable number field for Stock Alert Threshold / Desired Stock - mirrors
// the real page's own onchange-save inputs (productinfo_stock.js), saving
// on blur only when the value actually changed.
function StockNumberField({ label, value, editable, onSave }: { label: string; value: string; editable: boolean; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <FieldRow label={label}>
      {editable ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onSave(draft)
          }}
          className="w-24 rounded border border-border bg-surface px-2 py-1 text-sm text-right text-text!"
        />
      ) : (
        value || '—'
      )}
    </FieldRow>
  )
}

function CorrectStockModal({
  id,
  warehouseOptions,
  hasBatch,
  initialWarehouseId,
  onClose,
}: {
  id: string
  warehouseOptions: { value: string; label: string }[]
  hasBatch: boolean
  initialWarehouseId?: string
  onClose: () => void
}) {
  const correctStock = useCorrectStock()
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId ?? '')
  const [mouvement, setMouvement] = useState<'0' | '1'>('0')
  const [qty, setQty] = useState('')
  const [label, setLabel] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    if (!warehouseId) return setError('Warehouse is required!')
    if (!qty || Number(qty) <= 0) return setError('Quantity must be a positive number!')
    if (hasBatch && !batchNumber.trim()) return setError('Batch number is required for lot/serial tracked products!')
    correctStock.mutate(
      { id, warehouseId, qty, mouvement, label, unitPrice, batchNumber: batchNumber.trim() },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Save failed.') },
    )
  }

  return (
    <ModalShell
      title="Correct Stock"
      onClose={onClose}
      footer={
        <button type="button" onClick={handleSave} disabled={correctStock.isPending} className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60">
          {correctStock.isPending ? 'Saving...' : 'Save'}
        </button>
      }
    >
      <ModalField label="Warehouse">
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={modalInputCls}>
          <option value="">Select...</option>
          {warehouseOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </ModalField>
      <div className="grid grid-cols-2 gap-3">
        <ModalField label="Movement">
          <select value={mouvement} onChange={(e) => setMouvement(e.target.value as '0' | '1')} className={modalInputCls}>
            <option value="0">Add stock</option>
            <option value="1">Remove stock</option>
          </select>
        </ModalField>
        <ModalField label="Quantity">
          <input value={qty} onChange={(e) => setQty(e.target.value)} className={modalInputCls} />
        </ModalField>
      </div>
      <ModalField label="Unit Price">
        <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={modalInputCls} />
      </ModalField>
      <ModalField label="Label">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={modalInputCls} />
      </ModalField>
      {hasBatch && (
        <ModalField label="Batch Number">
          <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. LOT-001" className={modalInputCls} />
        </ModalField>
      )}
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </ModalShell>
  )
}

function TransferStockModal({
  id,
  warehouseOptions,
  hasBatch,
  initialWarehouseId,
  onClose,
}: {
  id: string
  warehouseOptions: { value: string; label: string }[]
  hasBatch: boolean
  initialWarehouseId?: string
  onClose: () => void
}) {
  const transferStock = useTransferStock()
  const [warehouseFrom, setWarehouseFrom] = useState(initialWarehouseId ?? '')
  const [warehouseTo, setWarehouseTo] = useState('')
  const [qty, setQty] = useState('')
  const [label, setLabel] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    if (!warehouseFrom || !warehouseTo) return setError('Both warehouses are required!')
    if (warehouseFrom === warehouseTo) return setError('Source and destination warehouses must differ!')
    if (!qty || Number(qty) <= 0) return setError('Quantity must be a positive number!')
    if (hasBatch && !batchNumber.trim()) return setError('Batch number is required for lot/serial tracked products!')
    transferStock.mutate(
      { id, warehouseFrom, warehouseTo, qty, label, batchNumber: batchNumber.trim() },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Save failed.') },
    )
  }

  return (
    <ModalShell
      title="Transfer Stock"
      onClose={onClose}
      footer={
        <button type="button" onClick={handleSave} disabled={transferStock.isPending} className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60">
          {transferStock.isPending ? 'Saving...' : 'Save'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <ModalField label="From Warehouse">
          <select value={warehouseFrom} onChange={(e) => setWarehouseFrom(e.target.value)} className={modalInputCls}>
            <option value="">Select...</option>
            {warehouseOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="To Warehouse">
          <select value={warehouseTo} onChange={(e) => setWarehouseTo(e.target.value)} className={modalInputCls}>
            <option value="">Select...</option>
            {warehouseOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
      </div>
      <ModalField label="Quantity">
        <input value={qty} onChange={(e) => setQty(e.target.value)} className={modalInputCls} />
      </ModalField>
      <ModalField label="Label">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={modalInputCls} />
      </ModalField>
      {hasBatch && (
        <ModalField label="Batch Number">
          <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. LOT-001" className={modalInputCls} />
        </ModalField>
      )}
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </ModalShell>
  )
}

// The same Correct Stock / Transfer Stock dialogs the Stock tab opens, for a
// caller that only has a product id — the Warehouse detail's per-product
// "Stock Movement" / "Stock Correction" actions. The dialogs need the product's
// warehouse list and batch flag, which the stock overview already carries;
// the warehouse the action was started from comes pre-selected.
export function ProductStockActionModal({ kind, productId, warehouseId, onClose }: { kind: 'correct' | 'transfer'; productId: string; warehouseId: string; onClose: () => void }) {
  const { data, isLoading, isError, error } = useProductStockOverview(productId)
  if (data) {
    const Modal = kind === 'correct' ? CorrectStockModal : TransferStockModal
    return <Modal id={productId} warehouseOptions={data.warehouseOptions} hasBatch={data.hasBatch} initialWarehouseId={warehouseId} onClose={onClose} />
  }
  return (
    <ModalShell
      title={kind === 'correct' ? 'Correct Stock' : 'Transfer Stock'}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-alt">
          Close
        </button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading stock details…</p>
      ) : (
        <p className="text-sm font-medium text-danger">{isError && error instanceof Error ? error.message : "Couldn't load this product's stock details."}</p>
      )}
    </ModalShell>
  )
}

export function StockTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductStockOverview(id)
  const setStockField = useSetStockField()
  const [stockModal, setStockModal] = useState<'correct' | 'transfer' | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading stock overview..." />
  if (isError) return <LegacyErrorCard title="Couldn't load stock" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  // No breakdown from the source -> every row is undefined and the panel stays hidden.
  const diff = data.stockDiff ?? {}
  const diffRows: { label: string; value: number; secondaryLabel: string; secondaryValue: number | undefined }[] = [
    { label: 'Customer Orders Running', value: diff.customer_orders_running, secondaryLabel: 'Draft', secondaryValue: diff.customer_orders_draft },
    { label: 'Shipment Already Sent', value: diff.shipment_already_sent, secondaryLabel: '', secondaryValue: undefined },
    { label: 'Supplier Orders Running', value: diff.supplier_orders_running, secondaryLabel: 'Draft', secondaryValue: diff.supplier_orders_draft },
    { label: 'MRP To Consume', value: diff.mrp_to_consume, secondaryLabel: 'To Produce', secondaryValue: diff.mrp_to_produce },
  ].filter((row): row is typeof row & { value: number } => row.value !== undefined)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <SectionHeader icon={Info} color="blue">
            Pricing & Cost
          </SectionHeader>
          <div>
            <Field label="Cost Price" value={data.pricing.costPrice} />
            <Field label="Avg Unit Price (PMP)" value={data.pricing.pmp} />
            <Field label="Buying Price Min" value={data.pricing.buyingPriceMin} />
            <Field label="Selling Price" value={data.pricing.sellingPrice} />
            <Field label="Min Price" value={data.pricing.minPrice} />
          </div>
        </Card>

        <Card className="!h-auto">
          <SectionHeader icon={Warehouse} color="green">
            Stock Information
          </SectionHeader>
          <div>
            <StockNumberField label="Stock Alert Threshold" value={data.stockAlertThreshold} editable={data.canEdit} onSave={(value) => setStockField.mutate({ id: id!, field: 'seuil_stock_alerte', value })} />
            <StockNumberField label="Desired Stock" value={data.desiredStock} editable={data.canEdit} onSave={(value) => setStockField.mutate({ id: id!, field: 'desiredstock', value })} />
            <FieldRow label="Physical Stock">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-semibold text-text!">{formatNumber(data.physicalStock)}</span>
                {data.physicalBelowLimit && <AlertTriangle size={14} className="text-warning" />}
                {/* Stock At Date / Virtual At Date open StockAtDatePage.tsx
                    (product/stock/fapi/stock_at_date.php) for this product.
                    Full List is real, native via movement_list_api.php - see
                    stockMovements.queries.ts. */}
                <Link to={`${ROUTES.productStockAtDate}?productid=${id}`} className="text-xs text-brand hover:underline">
                  Stock At Date
                </Link>
              </span>
            </FieldRow>
            <FieldRow label="Virtual Stock">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-semibold text-text!">{formatNumber(data.virtualStock)}</span>
                {data.virtualBelowLimit && <AlertTriangle size={14} className="text-warning" />}
                <Link to={`${ROUTES.productStockAtDate}?mode=future&productid=${id}`} className="text-xs text-brand hover:underline">
                  Virtual At Date
                </Link>
              </span>
            </FieldRow>
            {data.lastMovement && (
              <FieldRow label="Last Movement">
                <span className="inline-flex items-center gap-1.5">
                  {data.lastMovement}
                  <Link to={`${ROUTES.stockMovements}?idproduct=${id}`} className="text-xs text-brand hover:underline">
                    Full List
                  </Link>
                </span>
              </FieldRow>
            )}
          </div>
          <VirtualStockBreakdown
            id={id}
            fallback={
              diffRows.length > 0 ? (
            <div className="mt-1 pt-2 border-t border-border space-y-1">
              <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">Virtual Stock Breakdown</p>
              {diffRows.map((row) => (
                <p key={row.label} className="text-xs text-text-muted">
                  {row.label}: {formatNumber(row.value)}
                  {row.secondaryValue !== undefined && ` (${row.secondaryLabel}: ${formatNumber(row.secondaryValue)})`}
                </p>
              ))}
            </div>
          ) : null
            }
          />
        </Card>
      </div>

      {data.canStock && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setStockModal('correct')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10">
            <Wrench size={14} /> Correct Stock
          </button>
          <button type="button" onClick={() => setStockModal('transfer')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10">
            <ArrowLeftRight size={14} /> Transfer Stock
          </button>
          <BatchTrackingButton id={id!} enabled={data.hasBatch} />
        </div>
      )}

      {stockModal === 'correct' && <CorrectStockModal id={id!} warehouseOptions={data.warehouseOptions} hasBatch={data.hasBatch} onClose={() => setStockModal(null)} />}
      {stockModal === 'transfer' && <TransferStockModal id={id!} warehouseOptions={data.warehouseOptions} hasBatch={data.hasBatch} onClose={() => setStockModal(null)} />}

      <Card className="!h-auto">
        <SectionHeader icon={Warehouse} color="violet">
          Warehouse Details
        </SectionHeader>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <Th>Warehouse</Th>
                <Th right>Units</Th>
                <Th right>PMP</Th>
                <Th right>Stock Value (Purchase)</Th>
                <Th right>Sell Price Min</Th>
                <Th right>Stock Value (Sell)</Th>
              </tr>
            </thead>
            <tbody>
              {data.warehouses.length === 0 ? (
                <EmptyRow span={6} label="No Warehouse Stock Data" />
              ) : (
                data.warehouses.map((w) => (
                  <tr key={w.id} className="border-b border-border last:border-0">
                    <Td>
                      {w.ref}
                      {w.place && <span className="text-text-faint"> {w.place}</span>}
                    </Td>
                    <Td right>{formatNumber(w.units)}</Td>
                    <Td right muted>
                      {w.pmp || '—'}
                    </Td>
                    <Td right muted>
                      {w.valuePurchase || '—'}
                    </Td>
                    <Td right muted>
                      {w.sellPriceMin || '—'}
                    </Td>
                    <Td right muted>
                      {w.valueSell || '—'}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
                <tr className="border-t border-border">
                  <Td>Total:</Td>
                  <Td right>{formatNumber(data.totals.totalQty)}</Td>
                  <Td right muted>
                    {data.totals.avgPmp || '—'}
                  </Td>
                  <Td right muted>
                    {data.totals.totalValuePurchase || '—'}
                  </Td>
                  <Td right muted>
                    {data.totals.avgSellPrice || '—'}
                  </Td>
                  <Td right muted>
                    {data.totals.totalValueSell || '—'}
                  </Td>
                </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={History} color="amber">
          Recent Stock Movements
        </SectionHeader>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <Th>Date</Th>
                <Th>Label</Th>
                <Th right>Qty</Th>
                <Th>Warehouse</Th>
                <Th>User</Th>
              </tr>
            </thead>
            <tbody>
              {data.movements.length === 0 ? (
                <EmptyRow span={5} label="No Recent Movements" />
              ) : (
                data.movements.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <Td muted>{m.dateFormatted}</Td>
                    <Td>{m.label}</Td>
                    <Td right>{formatNumber(m.qty)}</Td>
                    <Td muted>{m.warehouse}</Td>
                    <Td muted>{m.user}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
