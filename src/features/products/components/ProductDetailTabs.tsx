import { VirtualStockBreakdown } from './VirtualStockBreakdown'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  CalendarClock,
  Save,
  Info,
  Tag,
  History,
  ChartPie,
  StickyNote,
  Pencil,
  Trash2,
  Truck,
  Ruler,
  ShoppingCart,
  Link2,
  Shapes,
  Warehouse,
  CheckCircle2,
  Circle,
  Barcode,
  Wand2,
  AlertTriangle,
  Star,
  Layers,
  Boxes,
  Plus,
  Wrench,
  ArrowLeftRight,
  Search,
  Upload,
  Download,
  TrendingUp,
  Clock,
  UserRound,
  DollarSign,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { formatMoney, formatNumber, formatDateTimeAmPm } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'
import { isBackendUnavailable, isBackendActionUnavailable, BackendUnavailableCard } from '../../../shared/components/BackendUnavailable'
import {
  useProductDetail,
  useProductDocuments,
  useUploadProductDocument,
  useDeleteProductDocument,
  useLinkProductDocument,
  useDeleteProductDocumentLink,
  useProductMargins,
  useProductStockOverview,
  useSetStockField,
  useProductUomOverview,
  useSaveProductBarcode,
  useGenerateProductBarcode,
  useSetBatchTracking,
  useDeleteUomConversion,
  useSaveUomConversion,
  useProductSupplierOverview,
  useProductPriceOverview,
  useDeletePriceLog,
  useCorrectStock,
  useTransferStock,
  useProductVariantOverview,
  useCreateCombination,
  useDeleteCombination,
  useProductCompositionOverview,
  useAddSubproduct,
  useDeleteSubproduct,
  useProductSearch,
  useProductStatsOverview,
  useProductNotesOverview,
  useSaveProductNotes,
  useProductAgendaEvents,
  useProductInvoiceStats,
  useUpdateProductPrice,
  type ProductUomOverview,
  type ProductVariantOverview,
  type ProductPriceOverview,
} from '../products.queries'
import {
  Th,
  Td,
  EmptyRow,
  TabTable,
  Field,
  FieldRow,
  SectionIcon,
  SectionHeader,
  StatusPill,
  MetricTile,
  ModalShell,
  ModalField,
  modalInputCls,
  sameOriginPath,
  type Tab,
} from './ProductDetailShared'

// Lot/batch tracking on or off for one product. Turning it off is refused by the server while lots exist, and that
// message is shown as it comes.
function BatchTrackingButton({ id, enabled }: { id: string; enabled: boolean }) {
  const confirm = useConfirm()
  const setTracking = useSetBatchTracking()
  const [error, setError] = useState('')
  async function toggle() {
    setError('')
    const turningOn = !enabled
    if (!(await confirm({ title: turningOn ? 'Enable lot tracking?' : 'Disable lot tracking?', message: turningOn ? 'Every stock movement of this product will then need a batch or serial number.' : 'Stock movements of this product will no longer carry a batch or serial number.', confirmLabel: turningOn ? 'Enable' : 'Disable', variant: 'default' }))) return
    setTracking.mutate({ id, enabled: turningOn }, { onError: (e) => setError(e instanceof Error ? e.message : 'Could not change the lot tracking.') })
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={setTracking.isPending} onClick={() => void toggle()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text text-sm font-medium hover:bg-surface-hover disabled:opacity-50">
        {setTracking.isPending ? 'Saving…' : enabled ? 'Disable lot tracking' : 'Enable lot tracking'}
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  )
}

function UpdatePriceModal({ id, data, onClose }: { id: string; data: ProductPriceOverview; onClose: () => void }) {
  const update = useUpdateProductPrice()
  // With no ZRA tax categories in play the price is saved through product/fapi/prices.php,
  // whose VAT list is plain JSON; otherwise the older form's own options are used.
  // The levy categories have their own fapi action now, so a ZRA product can use it too.
  const fz = data.fapiZra
  const levyViaFapi = !!fz && fz.enabled
  const viaFapi = !!data.fapiVatRates && (!data.zraEnabled || !!fz)
  const vatOptions = useMemo(
    () => (data.fapiVatRates ?? []).map((v) => ({ value: v.value, label: v.label, selected: v.selected })),
    [data.fapiVatRates],
  )
  const fapiLevyOptions = (levy: { code: string; options: { code: string; label: string; amount: number }[] } | undefined) => [
    { value: '', label: 'None', selected: !levy?.code },
    ...(levy?.options ?? []).map((o) => ({ value: o.code, label: `${o.code} — ${o.label} (${o.amount}%)`, selected: o.code === levy?.code })),
  ]
  const iplOptions = useMemo(() => fapiLevyOptions(fz?.levies.ipl), [fz])
  const tlOptions = useMemo(() => fapiLevyOptions(fz?.levies.tourism_levy), [fz])
  const exciseOptions = useMemo(() => fapiLevyOptions(fz?.levies.excise), [fz])

  const [baseType, setBaseType] = useState<'HT' | 'TTC'>(data.priceBaseType === 'TTC' ? 'TTC' : 'HT')
  const [price, setPrice] = useState(data.price.toFixed(2))
  const [priceTtc, setPriceTtc] = useState(data.priceTtc.toFixed(2))
  const [priceMin, setPriceMin] = useState(data.priceMin.toFixed(2))
  const [priceMinTtc, setPriceMinTtc] = useState(data.priceMinTtc.toFixed(2))
  const [vat, setVat] = useState(vatOptions.find((o) => o.selected)?.value ?? vatOptions[0]?.value ?? '0')
  const [ipl, setIpl] = useState(iplOptions.find((o) => o.selected)?.value ?? iplOptions[0]?.value ?? '0')
  const [tl, setTl] = useState(tlOptions.find((o) => o.selected)?.value ?? tlOptions[0]?.value ?? '0')
  const [excise, setExcise] = useState(exciseOptions.find((o) => o.selected)?.value ?? exciseOptions[0]?.value ?? '0')
  const [error, setError] = useState('')

  const selling = baseType === 'TTC' ? priceTtc : price
  const min = baseType === 'TTC' ? priceMinTtc : priceMin
  const setSelling = baseType === 'TTC' ? setPriceTtc : setPrice
  const setMin = baseType === 'TTC' ? setPriceMinTtc : setPriceMin

  function handleSave() {
    setError('')
    if (Number.isNaN(Number(selling)) || Number(selling) < 0) return setError('Selling price must be a valid number.')
    if (Number.isNaN(Number(min)) || Number(min) < 0) return setError('Min. selling price must be a valid number.')
    const chosen = viaFapi ? data.fapiVatRates!.find((v) => v.value === vat) : undefined
    // Only the levies that changed are sent (an unknown code is refused with the list of valid ones).
    const levies =
      levyViaFapi && fz
        ? {
            ...(ipl !== fz.levies.ipl.code ? { ipl_code: ipl } : {}),
            ...(tl !== fz.levies.tourism_levy.code ? { tourism_levy_code: tl } : {}),
            ...(excise !== fz.levies.excise.code ? { excise_code: excise } : {}),
          }
        : undefined
    update.mutate(
      {
        id,
        price: selling,
        priceMin: min,
        priceBaseType: baseType,
        tvaTx: vat,
        iplCatCd: ipl,
        tlCatCd: tl,
        exciseTxCatCd: excise,
        fapi: chosen ? { vatRate: chosen.rate, vatCode: chosen.code } : undefined,
        levies: levies && Object.keys(levies).length > 0 ? (levies as { ipl_code: string; tourism_levy_code: string; excise_code: string }) : undefined,
      },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Save failed.') },
    )
  }

  return (
    <ModalShell
      title="New Price"
      className="max-w-3xl"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={update.isPending} className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60">
            {update.isPending ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <ModalField label="VAT category Code">
          <select value={vat} onChange={(e) => setVat(e.target.value)} className={modalInputCls}>
            {vatOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
        {(data.zraEnabled || levyViaFapi) && (
          <>
            <ModalField label="IPL category code">
              <select value={ipl} onChange={(e) => setIpl(e.target.value)} className={modalInputCls}>
                {iplOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Tourism levy Code">
              <select value={tl} onChange={(e) => setTl(e.target.value)} className={modalInputCls}>
                {tlOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Excise tax category code">
              <select value={excise} onChange={(e) => setExcise(e.target.value)} className={modalInputCls}>
                {exciseOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </ModalField>
          </>
        )}
        <ModalField label="Price base">
          <select value={baseType} onChange={(e) => setBaseType(e.target.value as 'HT' | 'TTC')} className={modalInputCls}>
            <option value="HT">Excl. tax</option>
            <option value="TTC">Inc. tax</option>
          </select>
        </ModalField>
        <ModalField label="Selling price">
          <input value={selling} onChange={(e) => setSelling(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Min. selling price">
          <input value={min} onChange={(e) => setMin(e.target.value)} className={modalInputCls} />
        </ModalField>
      </div>
      {error && <p className="text-sm font-medium text-danger mt-3">{error}</p>}
    </ModalShell>
  )
}

function SellingPricesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductPriceOverview(id)
  const deleteLog = useDeletePriceLog()
  const confirm = useConfirm()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [showModal, setShowModal] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading selling prices..." />
  if (isError) return <LegacyErrorCard title="Couldn't load selling prices" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  async function handleDeleteLog(rowid: number) {
    if (!(await confirm({ title: 'Delete Price Log Entry?', message: 'Are you sure you want to delete this price log entry?' }))) return
    deleteLog.mutate({ id: id!, lineId: rowid })
  }

  const totalRecords = data.priceLog.length
  const totalPages = Math.ceil(totalRecords / pageSize)
  const pageStart = page * pageSize + 1
  const pageEnd = Math.min((page + 1) * pageSize, totalRecords)
  const paginatedData = data.priceLog.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="space-y-4">
      <Card className="!h-auto !py-2 sticky top-0 z-10 !bg-white dark:!bg-gray-950 border-b border-border">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <SectionIcon icon={Tag} color="green" /> Selling Prices
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-text-faint">Default Tax Rate</span>
            <span className="text-sm font-medium">{data.vatDisplay || '0%'}</span>
          </div>
          {data.zra.map((z) => (
            <div key={z.label} className="flex items-baseline gap-2">
              <span className="text-xs text-text-faint">{z.label}</span>
              <span className="text-sm font-medium">{z.amount} ({z.code})</span>
            </div>
          ))}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-text-faint">Selling Price</span>
            <span className="text-sm font-medium">{formatMoney(data.sellingPrice)} {data.priceBaseType}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-text-faint">Min Price</span>
            <span className="text-sm font-medium">{formatMoney(data.minPrice)} {data.priceBaseType}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
          {data.canCreate && !data.isVariant ? (
            <button type="button" onClick={() => setShowModal(true)} className="px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:opacity-90">
              Update Default Price
            </button>
          ) : (
            <button type="button" disabled className="px-3 py-1.5 rounded-md bg-brand/40 text-white text-sm font-medium cursor-default">
              Update Default Price
            </button>
          )}
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-faint">Page Size</label>
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 20); setPage(0) }} className={modalInputCls + ' py-1.5 w-24'}>
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
      {showModal && (
        <UpdatePriceModal
          id={id!}
          data={data}
          onClose={() => setShowModal(false)}
        />
      )}

      <Card className="!h-auto flex flex-col">
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="flex-1 flex flex-col -mx-4 border border-border rounded overflow-hidden isolate">
            <div className={`overflow-y-auto ${pageSize === 50 ? 'max-h-[900px]' : pageSize === 20 ? 'max-h-[550px]' : 'max-h-[400px]'}`}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <Th>Applied Prices From</Th>
                    <Th>Price Base</Th>
                    <Th right>Default Tax Rate</Th>
                    <Th right>HT</Th>
                    <Th right>TTC</Th>
                    <Th right>Min Price HT</Th>
                    <Th right>Min Price TTC</Th>
                    <Th>Changed By</Th>
                    {data.canDelete && <Th right>Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <EmptyRow span={data.canDelete ? 9 : 8} label={totalRecords === 0 ? 'No price history.' : 'No results for current page.'} />
                  ) : (
                    paginatedData.map((row) => (
                      <tr key={row.rowid} className="border-b border-border last:border-0">
                        <Td muted>{row.dateStr}</Td>
                        <Td muted>{row.priceBaseType}</Td>
                        <Td right muted>
                          {row.vatDisplay}
                        </Td>
                        <Td right>{formatMoney(row.price)}</Td>
                        <Td right>{formatMoney(row.priceTtc)}</Td>
                        <Td right muted>
                          {formatMoney(row.priceMin)}
                        </Td>
                        <Td right muted>
                          {formatMoney(row.priceMinTtc)}
                        </Td>
                        <Td muted>{row.userName}</Td>
                        {data.canDelete && (
                          <Td right>
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(row.rowid)}
                              disabled={deleteLog.isPending}
                              title="Delete log entry"
                              className="p-1 rounded text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-60"
                            >
                              <Trash2 size={14} />
                            </button>
                          </Td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalRecords > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-faint bg-white dark:bg-gray-950">
                <span>
                  {pageStart}–{pageEnd} of {totalRecords}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span className="px-1">
                    {page + 1} / {totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

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

function StockTab({ id }: { id: string | undefined }) {
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

// New Combination modal (variant_api.php?action=create_combination) - one
// value select per existing attribute (attributes themselves aren't created
// here, only combined; matches what the real endpoint accepts).
function NewCombinationModal({ id, attributes, onClose }: { id: string; attributes: ProductVariantOverview['attributes']; onClose: () => void }) {
  const createCombination = useCreateCombination()
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [reference, setReference] = useState('')
  const [priceImpact, setPriceImpact] = useState('')
  const [priceImpactPercent, setPriceImpactPercent] = useState(false)
  const [weightImpact, setWeightImpact] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    const features = attributes.map((a) => (selected[a.id] ? `${a.id}-${selected[a.id]}` : ''))
    if (features.some((f) => !f)) return setError('Select a value for every attribute.')
    createCombination.mutate(
      { id, features, reference, priceImpact: priceImpact || '0', priceImpactPercent, weightImpact: weightImpact || '0' },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create combination.') },
    )
  }

  return (
    <ModalShell
      title="New Combination"
      onClose={onClose}
      footer={
        <button type="button" onClick={handleSave} disabled={createCombination.isPending} className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60">
          {createCombination.isPending ? 'Creating...' : 'Create'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {attributes.map((a) => (
          <ModalField key={a.id} label={a.label}>
            <select value={selected[a.id] ?? ''} onChange={(e) => setSelected((s) => ({ ...s, [a.id]: e.target.value }))} className={modalInputCls}>
              <option value="">Select...</option>
              {a.values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.value}
                </option>
              ))}
            </select>
          </ModalField>
        ))}
        <ModalField label="Reference">
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Weight Impact">
          <input value={weightImpact} onChange={(e) => setWeightImpact(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Price Impact">
          <input value={priceImpact} onChange={(e) => setPriceImpact(e.target.value)} className={modalInputCls} />
        </ModalField>
        <label className="flex items-center gap-2 text-sm text-text mt-5">
          <input type="checkbox" checked={priceImpactPercent} onChange={(e) => setPriceImpactPercent(e.target.checked)} className="rounded border-border" />
          Price impact is a %
        </label>
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </ModalShell>
  )
}

// Variants tab (variant_api.php) - real attribute values + real
// combinations, replaces variants/combinations.php natively (New/Delete
// Combination both write through the real endpoint, no legacy link-out).
function ProductCombinationsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductVariantOverview(id)
  const deleteCombination = useDeleteCombination()
  const confirm = useConfirm()
  const [showNew, setShowNew] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading variants..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Product Combinations" />
  if (isError) return <LegacyErrorCard title="Couldn't load variants" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  async function handleDelete(combinationId: number, label: string) {
    const ok = await confirm({
      title: 'Delete Combination?',
      message: (
        <>
          Are you sure you want to delete <strong className="text-text!">{label}</strong>?
        </>
      ),
    })
    if (!ok) return
    deleteCombination.mutate({ id: id!, combinationId })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile icon={Layers} color="blue" label="Attributes" value={data.attributes.length} />
        <MetricTile icon={Boxes} color="green" label="Variants" value={data.combinations.length} />
        <MetricTile icon={Shapes} color="amber" label="Total Values" value={data.totalValues} />
      </div>

      <Card className="!h-auto">
        <SectionHeader icon={Shapes} color="violet">
          Attributes ({data.totalValues} values)
        </SectionHeader>
        {data.attributes.length === 0 ? (
          <p className="text-sm text-text-faint">No attributes defined for this product.</p>
        ) : (
          <div className="space-y-3">
            {data.attributes.map((a) => (
              <div key={a.id}>
                <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-1.5">{a.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {a.values.map((v) => (
                    <span key={v.id} className="px-2 py-0.5 rounded-md border border-border bg-surface-alt text-xs text-text!">
                      {v.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {data.canEdit && (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          disabled={data.attributes.length === 0}
          title={data.attributes.length === 0 ? 'Define a variant attribute first' : undefined}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> New Combination
        </button>
      )}
      {showNew && <NewCombinationModal id={id!} attributes={data.attributes} onClose={() => setShowNew(false)} />}

      <Card className="!h-auto">
        <SectionHeader icon={Layers} color="blue">
          Combinations ({data.combinations.length})
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Product</Th>
              <Th>Attributes</Th>
              <Th right>Price Impact</Th>
              <Th right>Weight Impact</Th>
              <Th>On Sell</Th>
              <Th>On Buy</Th>
              {data.canDelete && <Th right>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {data.combinations.length === 0 ? (
              <EmptyRow span={data.canDelete ? 7 : 6} label="None" />
            ) : (
              data.combinations.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <Td>
                    {c.ref} <span className="text-text-faint">{c.label}</span>
                  </Td>
                  <Td muted>{c.attributes.map((a) => `${a.label}: ${a.value}`).join(', ')}</Td>
                  <Td right muted>
                    {c.variationPrice >= 0 ? '+' : ''}
                    {formatMoney(c.variationPrice)}
                    {c.variationIsPercent ? ' %' : ''}
                  </Td>
                  <Td right muted>
                    {c.weightImpact >= 0 ? '+' : ''}
                    {formatNumber(c.weightImpact)}
                  </Td>
                  <Td>
                    <StatusPill active={c.forSale} activeLabel="Yes" inactiveLabel="No" tone="success" />
                  </Td>
                  <Td>{c.forPurchase === null ? '—' : <StatusPill active={c.forPurchase} activeLabel="Yes" inactiveLabel="No" tone="info" />}</Td>
                  {data.canDelete && (
                    <Td right>
                      <button type="button" onClick={() => handleDelete(c.id, c.label)} className="p-1.5 rounded-md text-danger hover:bg-danger-bg" title="Delete combination">
                        <Trash2 size={14} />
                      </button>
                    </Td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>
    </div>
  )
}

// Statistics tab (stats_api.php) - real sales/purchase figures computed
// server-side from llx_facturedet/llx_commande_fournisseurdet, replaces the
// old legacy-scrape usage report.
function StatisticsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductStatsOverview(id)
  if (isLoading) return <LegacyLoadingCard label="Loading statistics..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Statistics" />
  if (isError) return <LegacyErrorCard title="Couldn't load statistics" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile icon={DollarSign} color="green" label="Total Sales" value={formatMoney(data.totalSales)} caption={data.periodLabel} />
        <MetricTile icon={ShoppingCart} color="amber" label="Total Purchase" value={formatMoney(data.totalPurchase)} caption={data.periodLabel} />
        <MetricTile icon={Boxes} color="blue" label="Qty Sold" value={formatNumber(data.qtySold)} caption={data.periodLabel} />
        <MetricTile icon={TrendingUp} color="violet" label="Margin" value={`${data.marginPct.toFixed(1)}%`} caption="Sales vs. purchase" />
      </div>

      <Card className="!h-auto">
        <SectionHeader icon={TrendingUp} color="indigo">
          Monthly Sales &amp; Purchases (12 months)
        </SectionHeader>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly.map((m) => ({ month: m.month, Sales: m.sales, Purchase: m.purchase ?? 0 }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Sales" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Purchase" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={ChartPie} color="indigo">
          Monthly Breakdown
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Month</Th>
              <Th right>Sales</Th>
              <Th right>Purchase</Th>
              <Th right>Qty</Th>
            </tr>
          </thead>
          <tbody>
            {data.monthly.length === 0 ? (
              <EmptyRow span={4} label="No sales or purchase activity yet." />
            ) : (
              data.monthly.map((m) => (
                <tr key={m.month} className="border-b border-border last:border-0">
                  <Td muted>{m.month}</Td>
                  <Td right>{formatMoney(m.sales)}</Td>
                  <Td right muted>
                    {m.purchase === null ? '—' : formatMoney(m.purchase)}
                  </Td>
                  <Td right muted>
                    {formatNumber(m.qty)}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={UserRound} color="cyan">
          Top Customers
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Customer</Th>
              <Th right>Qty</Th>
              <Th right>Total</Th>
            </tr>
          </thead>
          <tbody>
            {data.topCustomers.length === 0 ? (
              <EmptyRow span={3} label="No customers have purchased this product yet." />
            ) : (
              data.topCustomers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <Td>{c.name}</Td>
                  <Td right muted>
                    {formatNumber(c.qty)}
                  </Td>
                  <Td right>{formatMoney(c.total)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>
    </div>
  )
}

// Notes tab (note_api.php) - real llx_product.note_public/note fields,
// replaces the old (unrouted on this backend) api/products/?action=update-note.
function NoteCard({ title, icon, color, value, empty, onSave, saving, error }: { title: string; icon: typeof StickyNote; color: 'blue' | 'amber'; value: string; empty: string; onSave: (v: string) => void; saving: boolean; error: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const inputCls = 'w-full rounded-md border border-input-border bg-input-bg text-text text-sm p-3 outline-none focus:ring-2 focus:ring-brand/30'
  return (
    <Card className="!h-auto">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader icon={icon} color={color}>
          {title}
        </SectionHeader>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} title={`Edit ${title.toLowerCase()}`} className="p-1.5 rounded-md border border-border text-text-muted hover:bg-surface-hover">
            <Pencil size={14} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className={inputCls} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                onSave(draft)
                setEditing(false)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(value)
                setEditing(false)
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value.trim() ? (
        <p className="whitespace-pre-wrap text-sm text-text!">{value}</p>
      ) : (
        <p className="py-6 text-center text-sm text-text-faint">{empty}</p>
      )}
      {error && <p className="mt-2 text-xs text-danger">Could not save please try again.</p>}
    </Card>
  )
}

function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductNotesOverview(id)
  const saveNotes = useSaveProductNotes()

  if (isLoading) return <LegacyLoadingCard label="Loading notes..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Notes" />
  if (isError) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  // Each card saves only the note it shows: product/fapi/notes.php writes only what it is sent.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <NoteCard title="Public Note" icon={StickyNote} color="blue" value={data?.notePublic ?? ''} empty="No public note" saving={saveNotes.isPending} error={saveNotes.isError} onSave={(v) => id && saveNotes.mutate({ id, notePublic: v })} />
      <NoteCard title="Private Note" icon={StickyNote} color="amber" value={data?.notePrivate ?? ''} empty="No private note" saving={saveNotes.isPending} error={saveNotes.isError} onSave={(v) => id && saveNotes.mutate({ id, notePrivate: v })} />
    </div>
  )
}

function UomConversionModal({
  id,
  conversion,
  packingOptions,
  uomOptions,
  onClose,
}: {
  id: string
  conversion: ProductUomOverview['conversions'][number] | null
  packingOptions: { value: string; label: string }[]
  uomOptions: { value: string; label: string }[]
  onClose: () => void
}) {
  const saveConversion = useSaveUomConversion()
  const [packingUnit, setPackingUnit] = useState(conversion ? String(conversion.packingUnitId) : '')
  const [uomUnit, setUomUnit] = useState(conversion ? String(conversion.uomUnitId) : '')
  const [factor, setFactor] = useState(conversion ? String(conversion.factor) : '')
  const [isDefault, setIsDefault] = useState(conversion?.isDefault ?? false)
  const [priceTtc, setPriceTtc] = useState(conversion?.priceOverrideTtc ? String(conversion.priceOverrideTtc) : '')
  const [barcode, setBarcode] = useState(conversion?.barcode ?? '')
  const [note, setNote] = useState(conversion?.note ?? '')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    if (!packingUnit) return setError('Packing Unit is required!')
    if (!uomUnit) return setError('Base UOM is required!')
    if (!factor || Number(factor) <= 0) return setError('Factor must be a positive number!')
    saveConversion.mutate(
      { id, convId: conversion?.id ?? 0, packingUnit, uomUnit, factor, isDefault, priceTtc, barcode, note },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Save failed.') },
    )
  }

  return (
    <ModalShell
      title={conversion ? 'Edit UOM Conversion' : 'Add UOM Conversion'}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={saveConversion.isPending}
          className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
        >
          {saveConversion.isPending ? 'Saving...' : 'Save'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <ModalField label="Packing Unit">
          <select value={packingUnit} onChange={(e) => setPackingUnit(e.target.value)} className={modalInputCls}>
            <option value="">Select...</option>
            {packingOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Base UOM">
          <select value={uomUnit} onChange={(e) => setUomUnit(e.target.value)} className={modalInputCls}>
            <option value="">Select...</option>
            {uomOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Factor">
          <input value={factor} onChange={(e) => setFactor(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Price Override TTC">
          <input value={priceTtc} onChange={(e) => setPriceTtc(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Barcode">
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={modalInputCls} />
        </ModalField>
        <label className="flex items-center gap-2 text-sm text-text mt-5">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded border-border" />
          Default
        </label>
      </div>
      <ModalField label="Note">
        <input value={note} onChange={(e) => setNote(e.target.value)} className={modalInputCls} />
      </ModalField>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </ModalShell>
  )
}

function UomSettingsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductUomOverview(id)
  const deleteConversion = useDeleteUomConversion()
  const confirm = useConfirm()
  const saveBarcode = useSaveProductBarcode()
  const generateBarcode = useGenerateProductBarcode()
  const [barcodeDraft, setBarcodeDraft] = useState('')
  const [barcodeError, setBarcodeError] = useState('')
  const [conversionModal, setConversionModal] = useState<{ mode: 'add' } | { mode: 'edit'; conversion: NonNullable<typeof data>['conversions'][number] } | null>(null)

  useEffect(() => setBarcodeDraft(data?.productBarcode ?? ''), [data?.productBarcode])

  if (isLoading) return <LegacyLoadingCard label="Loading UOM settings..." />
  if (isError) return <LegacyErrorCard title="Couldn't load UOM settings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  async function handleDeleteConversion(convId: number) {
    if (!(await confirm({ title: 'Delete UOM Conversion?', message: 'Are you sure you want to delete this UOM conversion?' }))) return
    deleteConversion.mutate({ id: id!, convId })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile icon={Ruler} color="blue" label="Base Unit" value={data.baseUnitLabel} caption="Base Unit" />
        <MetricTile icon={Layers} color="green" label="Conversions" value={data.conversionsCount} caption="Total Conversions" />
        <MetricTile icon={Boxes} color="indigo" label="Available Stock" value={data.availableStock} caption="On hand, in the base unit" />
      </div>

      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-2.5">
          <SectionHeader icon={Ruler} color="violet">
            UOM Conversions
          </SectionHeader>
          {data.canEdit && (
            <button
              type="button"
              onClick={() => setConversionModal({ mode: 'add' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-xs font-medium hover:bg-brand-hover"
            >
              <Plus size={14} /> Add UOM Conversion
            </button>
          )}
        </div>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <Th>Packing Unit</Th>
                <Th>Base UOM</Th>
                <Th right>Factor</Th>
                <Th right>Purchase Price TTC</Th>
                <Th right>Selling Price TTC</Th>
                <Th right>Price Override TTC</Th>
                <Th>Barcode</Th>
                <Th>Note</Th>
                <Th>Default</Th>
                {data.canEdit && <Th right>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {data.conversions.length === 0 ? (
                <EmptyRow span={data.canEdit ? 10 : 9} label="No UOM Conversions Defined" />
              ) : (
                data.conversions.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <Td>{c.packingLabel}</Td>
                    <Td muted>{c.uomLabel}</Td>
                    <Td right>{c.factor}</Td>
                    <Td right muted>
                      {c.purchasePriceTtc ? formatMoney(c.purchasePriceTtc) : '—'}
                    </Td>
                    <Td right muted>
                      {c.sellingPriceTtc ? formatMoney(c.sellingPriceTtc) : '—'}
                    </Td>
                    <Td right muted>
                      {c.priceOverrideTtc ? formatMoney(c.priceOverrideTtc) : '—'}
                    </Td>
                    <Td muted>{c.barcode || '—'}</Td>
                    <Td muted>{c.note || '—'}</Td>
                    <Td muted>{c.isDefault ? <CheckCircle2 size={14} className="text-success" /> : ''}</Td>
                    {data.canEdit && (
                      <Td right>
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setConversionModal({ mode: 'edit', conversion: c })}
                            title="Edit conversion"
                            className="p-1 rounded text-text-faint hover:bg-info-bg hover:text-info disabled:opacity-60"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConversion(c.id)}
                            disabled={deleteConversion.isPending}
                            title="Delete conversion"
                            className="p-1 rounded text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </Td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {conversionModal && (
        <UomConversionModal
          id={id!}
          conversion={conversionModal.mode === 'edit' ? conversionModal.conversion : null}
          packingOptions={data.packingUnitOptions}
          uomOptions={data.uomUnitOptions}
          onClose={() => setConversionModal(null)}
        />
      )}

      <Card className="!h-auto">
        <SectionHeader icon={Barcode} color="amber">
          Barcode Management
        </SectionHeader>
        <div className="space-y-2">
          <label className="text-xs text-text-faint">Set Barcode</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={barcodeDraft}
              onChange={(e) => setBarcodeDraft(e.target.value)}
              placeholder="Enter barcode value"
              disabled={!data.canEdit}
              className="flex-1 min-w-[180px] rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text! disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!data.canEdit || saveBarcode.isPending}
              onClick={() => {
                setBarcodeError('')
                saveBarcode.mutate(
                  { id: id!, barcode: barcodeDraft },
                  { onError: (err) => setBarcodeError(err instanceof Error ? err.message : 'Failed to save barcode.') },
                )
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-60"
            >
              <Save size={14} /> {saveBarcode.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              disabled={!data.canEdit || generateBarcode.isPending}
              onClick={() => {
                setBarcodeError('')
                generateBarcode.mutate(id!, {
                  onSuccess: (result) => setBarcodeDraft(result.barcode),
                  onError: (err) => setBarcodeError(err instanceof Error ? err.message : 'Failed to generate barcode.'),
                })
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text disabled:opacity-60"
            >
              <Wand2 size={14} /> {generateBarcode.isPending ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {barcodeError && <p className="text-xs text-danger">{barcodeError}</p>}
        </div>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={Tag} color="rose">
          Lot/Batch Tracking
        </SectionHeader>
        <FieldRow label="Lot/Batch Tracking Enabled">
          <span className={`inline-flex items-center gap-1.5 font-medium ${data.hasBatchTracking ? 'text-success' : 'text-text-muted'}`}>
            {data.hasBatchTracking ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            {data.hasBatchTracking ? 'Yes' : 'No'}
          </span>
        </FieldRow>
        {data.canEdit && <BatchTrackingButton id={id!} enabled={data.hasBatchTracking} />}
      </Card>
    </div>
  )
}

function BuyingPricesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductSupplierOverview(id)
  if (isLoading) return <LegacyLoadingCard label="Loading supplier prices..." />
  if (isError) return <LegacyErrorCard title="Couldn't load supplier prices" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile icon={Truck} color="blue" label="Suppliers" value={data.suppliersCount} caption="Total suppliers linked" />
        <MetricTile icon={Tag} color="green" label="Best Unit Price" value={data.bestUnitPrice !== null ? formatMoney(data.bestUnitPrice) : '—'} caption={data.bestPriceSupplierName || 'Not available'} />
        <MetricTile icon={Star} color="violet" label="Avg Price" value={data.avgUnitPrice !== null ? formatMoney(data.avgUnitPrice) : '—'} caption={data.avgUnitPrice !== null ? 'Across all suppliers' : 'Not available'} />
      </div>

      <div className="flex items-center gap-3">
        {/* The legacy tab's "Add Supplier Price". product/fapi/suppliers.php answers 405 to every write (GET only), so there is nothing to post yet:
            the button stays off until the endpoint can create, change and delete a supplier price (report row). */}
        <button
          type="button"
          disabled
          title="Needs a supplier-price write endpoint (suppliers.php only reads)"
          className="px-3 py-1.5 rounded-md bg-brand/40 text-white text-sm font-medium cursor-not-allowed"
        >
          Add Supplier Price
        </button>
      </div>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-3 mb-1 border-b border-border">
          <div>
            <p className="text-xs text-text-faint">Cost Price</p>
            <p className="text-sm font-semibold text-brand">{formatMoney(data.costPrice)} ZMW</p>
          </div>
          <div>
            <p className="text-xs text-text-faint">PMP (Avg Unit Price)</p>
            <p className="text-sm text-text-faint">{data.pmp ? `${formatMoney(data.pmp)} ZMW` : 'Not defined'}</p>
          </div>
          <div>
            <p className="text-xs text-text-faint">Best Buying Price</p>
            <p className="text-sm text-text-faint">{data.bestUnitPrice !== null ? `${formatMoney(data.bestUnitPrice)} ZMW` : 'Not defined'}</p>
          </div>
        </div>

        <SectionHeader icon={Truck} color="indigo">
          Supplier Prices
        </SectionHeader>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <Th>Supplier</Th>
                <Th>Ref Supplier</Th>
                <Th right>Qty Min</Th>
                <Th right>VAT</Th>
                <Th right>Price HT</Th>
                <Th right>Unit Price HT</Th>
                <Th>Currency</Th>
                <Th>Delivery (Days)</Th>
                <Th>Reputation</Th>
              </tr>
            </thead>
            <tbody>
              {data.suppliers.length === 0 ? (
                <EmptyRow span={9} label="No Supplier Prices Found add supplier prices to see them listed here." />
              ) : (
                data.suppliers.map((row) => (
                  <tr key={row.rowid} className="border-b border-border last:border-0">
                    <Td>{row.supplierName}</Td>
                    <Td muted>{row.refFourn || '—'}</Td>
                    <Td right muted>
                      {formatNumber(row.quantity)}
                    </Td>
                    <Td right muted>
                      {row.vatRate}
                    </Td>
                    <Td right>{formatMoney(row.priceHt)}</Td>
                    <Td right>{formatMoney(row.unitPrice)}</Td>
                    <Td muted>{row.currency || '—'}</Td>
                    <Td muted>{row.deliveryDays ?? '—'}</Td>
                    <Td muted>{row.reputation || '—'}</Td>
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

// Add Sub-Product panel (subproduct_api.php?action=add_subproduct) - search
// reuses the existing useProductSearch hook (api/products/?action=list&search=,
// already wired for the ZRA product picker) rather than subproduct_api.php's
// own search_products action, same real catalog either way.
function AddSubproductPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])
  const { data: results } = useProductSearch(debounced)
  const [selected, setSelected] = useState<{ id: string; ref: string; label: string } | null>(null)
  const [qty, setQty] = useState('1')
  const [incdec, setIncdec] = useState(true)
  const [error, setError] = useState('')
  const addSubproduct = useAddSubproduct()

  function handleAdd() {
    setError('')
    if (!selected) return setError('Search and select a product first.')
    if (!qty || Number(qty) <= 0) return setError('Quantity must be a positive number.')
    addSubproduct.mutate(
      { id, childId: selected.id, qty, incdec },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add sub-product.') },
    )
  }

  return (
    <Card className="!h-auto">
      <SectionHeader icon={Search} color="blue">
        Add Sub-Product
      </SectionHeader>
      <div className="space-y-3">
        <div className="relative">
          <input
            value={selected ? `${selected.ref} - ${selected.label}` : query}
            onChange={(e) => {
              setSelected(null)
              setQuery(e.target.value)
            }}
            placeholder="Search product by ref or label..."
            className={modalInputCls}
          />
          {!selected && debounced.trim().length > 1 && results && results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelected(r)
                    setQuery('')
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover"
                >
                  <span className="font-medium text-text!">{r.ref}</span> <span className="text-text-faint">- {r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-text-faint">Qty</label>
          <input value={qty} onChange={(e) => setQty(e.target.value)} className={`${modalInputCls} w-24`} />
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={incdec} onChange={(e) => setIncdec(e.target.checked)} className="rounded border-border" />
            Affects stock
          </label>
        </div>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={addSubproduct.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60"
          >
            <Plus size={14} /> {addSubproduct.isPending ? 'Adding...' : 'Add'}
          </button>
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border border-border text-text-muted text-sm hover:bg-surface-alt">
            Cancel
          </button>
        </div>
      </div>
    </Card>
  )
}

// Composition tab (subproduct_api.php) - real kit/bundle sub-products,
// replaces product/composition/card.php natively (search-to-add and
// remove both write through the real endpoint, no legacy link-out).
function AssociatedProductsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductCompositionOverview(id)
  const deleteSubproduct = useDeleteSubproduct()
  const confirm = useConfirm()
  const [showAdd, setShowAdd] = useState(false)
  const { data: product } = useProductDetail(id)
  const currency = product?.currency ?? ''

  if (isLoading) return <LegacyLoadingCard label="Loading composition..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Composition" />
  if (isError) return <LegacyErrorCard title="Couldn't load composition" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  async function handleDelete(childId: number, label: string) {
    const ok = await confirm({
      title: 'Remove Product?',
      message: (
        <>
          Remove <strong className="text-text!">{label}</strong> from this composition?
        </>
      ),
    })
    if (!ok) return
    deleteSubproduct.mutate({ id: id!, childId })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile icon={Boxes} color="blue" label="Subproducts" value={data.compositions.length} />
        <MetricTile icon={Link2} color="green" label="Parent Products" value={data.parents.length} />
        <MetricTile icon={DollarSign} color="amber" label="Total Of Subproducts Buying Prices" value={`${formatMoney(data.totalBuy)} ${currency}`.trim()} />
        <MetricTile icon={Tag} color="violet" label="Total Of Subproducts Selling Prices" value={`${formatMoney(data.totalSell)} ${currency}`.trim()} />
      </div>

      <p className="text-xs text-text-faint px-1">
        Nature of product (raw/manufactured): <strong className="text-text!">{data.natureLabel || '—'}</strong>
        {product && product.priceInclTax > 0 && (
          <>
            {' '}· Selling price: <strong className="text-text!">{formatMoney(product.priceBaseType === 'TTC' ? product.priceInclTax : product.priceExclTax)} {product.priceBaseType === 'TTC' ? 'TTC' : 'HT'}</strong>
          </>
        )}
      </p>

      <Card className="!h-auto">
        <SectionHeader icon={Link2} color="amber">
          Parent products
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Ref.</Th>
              <Th>Label</Th>
              <Th right>Qty</Th>
            </tr>
          </thead>
          <tbody>
            {data.parents.length === 0 ? (
              <EmptyRow span={3} label="None" />
            ) : (
              data.parents.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <Td muted>{p.ref}</Td>
                  <Td>{p.label}</Td>
                  <Td right>{formatNumber(p.qty)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>

      {showAdd && <AddSubproductPanel id={id!} onClose={() => setShowAdd(false)} />}

      <Card className="!h-auto">
        <div className="flex items-center justify-between gap-3 mb-1">
          <SectionHeader icon={Boxes} color="indigo">
            List of products/services that are component(s) of this kit ({data.compositions.length})
          </SectionHeader>
          {data.canEdit && !showAdd && (
            <button type="button" onClick={() => setShowAdd(true)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:opacity-90">
              <Plus size={14} /> Search product to add
            </button>
          )}
        </div>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Child Products</Th>
              <Th>Label</Th>
              <Th right>Minimum Buying Price</Th>
              <Th right>Minimum Selling Price</Th>
              <Th right>Stock</Th>
              <Th right>Qty</Th>
              <Th>Increase/Decrease Stock On Parent Change</Th>
              <Th>Status</Th>
              {data.canEdit && <Th right>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {data.compositions.length === 0 ? (
              <EmptyRow span={data.canEdit ? 9 : 8} label="None" />
            ) : (
              data.compositions.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <Td muted>{c.ref}</Td>
                  <Td>{c.label}</Td>
                  <Td right muted>
                    {c.buyDefined ? formatMoney(c.buyPrice) : '—'}
                  </Td>
                  <Td right muted>
                    {c.sellPrice !== null ? formatMoney(c.sellPrice) : '—'}
                  </Td>
                  <Td right muted>
                    {formatNumber(c.stock)}
                  </Td>
                  <Td right>{formatNumber(c.qty)}</Td>
                  <Td muted>{c.incdec ? 'Yes' : 'No'}</Td>
                  <Td>
                    <StatusPill active={c.forSale} activeLabel="On Sell" inactiveLabel="Not for sale" tone="success" />
                  </Td>
                  {data.canEdit && (
                    <Td right>
                      <button type="button" onClick={() => handleDelete(c.id, c.label)} className="p-1.5 rounded-md text-danger hover:bg-danger-bg" title="Remove sub-product">
                        <Trash2 size={14} />
                      </button>
                    </Td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>
    </div>
  )
}

// Legacy's Related Items rows link out to that document type's own list
// page (propal.php, commande.php, facture.php, ...), each pre-filtered to
// this product - this app has no per-product filter on those list pages
// yet, so these route to the real, live list module for that document type
// instead (same destination a user would reach from the sidebar), rather
// than routing back to the legacy PHP page per the standing rule. Matched
// by keyword rather than exact string since the API's referer labels aren't
// a fixed enum (confirmed live: "Purchase orders" is lowercase "orders"
// unlike its siblings).
// The names the classic Related Items table prints.
const CLASSIC_RELATED: Record<string, string> = {
  quotations: 'Quotations',
  'sales orders': 'Sales Orders',
  'purchase orders': 'Purchase Orders',
  'customer invoices': 'Customers Invoices',
  'vendor invoices': 'Vendors Invoices',
  contracts: 'Contracts',
}
const classicRelatedName = (label: string) => CLASSIC_RELATED[label.trim().toLowerCase()] ?? label

function refererListRoute(label: string): string | null {
  const l = label.toLowerCase()
  if (l.includes('quotation')) return ROUTES.quotationList
  if (l.includes('supplierproposal') || l.includes('supplier proposal')) return ROUTES.supplierProposalList
  if (l.includes('sales order')) return ROUTES.orderList
  if (l.includes('purchase order')) return ROUTES.purchaseOrderList
  if (l.includes('customer') && l.includes('invoice')) return ROUTES.invoiceList
  if (l.includes('vendor') && l.includes('invoice')) return ROUTES.vendorInvoiceList
  if (l.includes('contract')) return ROUTES.contractList
  return null
}

// Invoice Stats tab (invoice_stats_api.php) - customer invoices with this
// product, paginated + filterable by month/year. Mirrors legacy's "Related items"
// table exactly (product/stats/facture.php), with Period/Year/PageSize filters
// and invoices detail table.
function InvoiceStatsTab({ id }: { id: string | undefined }) {
  const [page, setPage] = useState(0)
  const [month, setMonth] = useState(0)
  const [year, setYear] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const { data, isLoading, isError, error, refetch } = useProductInvoiceStats(id, page, month, year, pageSize)

  if (isLoading) return <LegacyLoadingCard label="Loading invoice stats..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Invoice Stats" />
  if (isError) return <LegacyErrorCard title="Couldn't load invoice stats" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  const pageStart = page * pageSize + 1
  const pageEnd = Math.min((page + 1) * pageSize, data.totalRecords)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricTile icon={DollarSign} color="green" label="Invoiced Total" value={formatMoney(data.totalHT)} caption="Excl. tax, all customer invoices" />
        <MetricTile icon={Boxes} color="blue" label="Total Qty Invoiced" value={formatNumber(data.totalQty)} caption="Units across all invoices" />
        <MetricTile icon={FileText} color="violet" label="Invoice Lines" value={formatNumber(data.totalRecords)} caption="Matching current filter" />
      </div>

      <Card className="!h-auto">
        <SectionHeader icon={Link2} color="indigo">
          Related Items
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Related Items</Th>
              <Th right>Number Of Third Parties</Th>
              <Th right>Number Of Related Items</Th>
              <Th right>Total Quantity</Th>
            </tr>
          </thead>
          <tbody>
            {data.referers.length === 0 ? (
              <EmptyRow span={4} label="No related items for this product." />
            ) : (
              data.referers.map((r) => {
                const route = refererListRoute(r.label)
                return (
                  <tr key={r.label} className="border-b border-border last:border-0">
                    <Td>
                      {route ? (
                        <Link to={route} className="text-brand hover:underline">
                          {classicRelatedName(r.label)}
                        </Link>
                      ) : (
                        classicRelatedName(r.label)
                      )}
                    </Td>
                    <Td right muted>
                      {r.nbThirdparties === null ? '—' : formatNumber(r.nbThirdparties)}
                    </Td>
                    <Td right muted>
                      {r.nbObjects}
                    </Td>
                    <Td right>{r.qty}</Td>
                  </tr>
                )
              })
            )}
          </tbody>
        </TabTable>
      </Card>

      <Card className="!h-auto flex flex-col">
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <SectionHeader icon={FileText} color="green">
              Customer Invoices
            </SectionHeader>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border bg-surface text-xs font-medium text-text-faint">
              {formatNumber(data.totalRecords)} Records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 -mx-4 px-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-faint">Period</label>
              <select value={month} onChange={(e) => { setMonth(parseInt(e.target.value) || 0); setPage(0) }} className={modalInputCls + ' py-1.5'}>
                <option value="0">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-faint">Year</label>
              <select value={year} onChange={(e) => { setYear(parseInt(e.target.value) || 0); setPage(0) }} className={modalInputCls + ' py-1.5'}>
                <option value="0">All Years</option>
                {data.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-text-faint">Page Size</label>
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 20); setPage(0) }} className={modalInputCls + ' py-1.5 w-24'}>
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setMonth(0)
                  setYear(0)
                  setPageSize(20)
                  setPage(0)
                }}
                className="px-3 py-1.5 rounded-md border border-border text-sm text-text-muted hover:bg-surface-hover"
              >
                Remove filter
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col -mx-4 border border-border rounded overflow-hidden isolate">
            <div className="overflow-y-auto max-h-[550px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <Th>Ref.</Th>
                    <Th>Company</Th>
                    <Th>Customer Code</Th>
                    <Th>Invoice Date</Th>
                    <Th right>Qty</Th>
                    <Th right>Amount (Excl. Tax)</Th>
                    <Th right>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {!data.invoices || data.invoices.length === 0 ? (
                    <EmptyRow span={7} label="No Record Found" />
                  ) : (
                    data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border last:border-0">
                        <Td muted>
                          {/* No per-invoice detail page exists in this rebuild yet
                              (routes.ts has no invoiceDetail route) - routes to the
                              real Invoices module rather than back to the legacy
                              facture.php card, consistent with the Related Items
                              links above. */}
                          <Link to={ROUTES.invoiceList} className="text-brand hover:underline">
                            {inv.ref}
                          </Link>
                        </Td>
                        <Td>
                          <Link to={ROUTES.customerList} className="text-brand hover:underline">
                            {inv.company}
                          </Link>
                        </Td>
                        <Td muted>{inv.customerCode}</Td>
                        <Td muted>{formatDateTimeAmPm(inv.date)}</Td>
                        <Td right muted>
                          {formatNumber(inv.qty)}
                        </Td>
                        <Td right>{formatMoney(inv.totalHT)}</Td>
                        <Td right>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${inv.statusClass === 'success' ? 'bg-success-bg text-success-fg' : inv.statusClass === 'warning' ? 'bg-warning-bg text-warning-fg' : 'bg-secondary-bg text-secondary-fg'}`}>
                            {inv.status}
                          </span>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
                {data.totalRecords > 0 && (
                  <tfoot>
                    <tr className="border-t border-border font-semibold text-text!">
                      <td colSpan={4} className="px-3 py-2">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(data.totalQty)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(data.totalHT)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {data.totalRecords > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-faint bg-white dark:bg-gray-950">
                <span>
                  {pageStart}–{pageEnd} of {data.totalRecords}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span className="px-1">
                    {page + 1} / {data.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={page >= data.totalPages - 1}
                    onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// Documents tab (document_api.php) - real filesystem listing under
// documents/produit/<ref>/, replaces the old product/document.php scrape.
// Upload/delete both write through the real endpoint, no legacy link-out.
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Kilobytes`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Megabytes`
}

function LinkedFilesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductDocuments(id)
  const uploadDocument = useUploadProductDocument()
  const deleteDocument = useDeleteProductDocument()
  const confirm = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState('')
  const linkDocument = useLinkProductDocument()
  const deleteLink = useDeleteProductDocumentLink()
  const [showLink, setShowLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading documents..." />
  if (isError) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !id) return
    setUploadError('')
    uploadDocument.mutate({ id, file }, { onError: (err) => setUploadError(err instanceof Error ? err.message : 'Upload failed.') })
  }

  async function handleDelete(filename: string) {
    if (!id) return
    const ok = await confirm({
      title: 'Delete File?',
      message: (
        <>
          Are you sure you want to delete <strong className="text-text!">{filename}</strong>?
        </>
      ),
    })
    if (!ok) return
    deleteDocument.mutate({ id, filename })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricTile icon={Boxes} color="blue" label="Number Of Attached Files/Documents" value={data?.count ?? 0} />
        <MetricTile icon={Layers} color="green" label="Total Size Of Attached Files" value={formatBytes((data?.documents ?? []).reduce((sum, d) => sum + (d.sizeBytes ?? (Number(d.size) || 0)), 0))} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-faint">{data?.count ?? 0} file(s)</p>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadDocument.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10 disabled:opacity-60"
          >
            <Upload size={14} /> {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
          </button>
          <button
            type="button"
            onClick={() => setShowLink((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:opacity-90"
          >
            <Link2 size={14} /> Link a new file/document
          </button>
        </div>
      </div>
      {showLink && (
        <Card className="!h-auto">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <p className="mb-1 text-xs font-medium text-text-faint">Link (URL)</p>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" className={modalInputCls} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-text-faint">Label</p>
              <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className={modalInputCls} />
            </div>
            <button
              type="button"
              disabled={!linkUrl.trim() || linkDocument.isPending}
              onClick={() =>
                id &&
                linkDocument.mutate(
                  { id, link: linkUrl.trim(), label: linkLabel.trim() },
                  {
                    onSuccess: () => {
                      setLinkUrl('')
                      setLinkLabel('')
                      setShowLink(false)
                    },
                  },
                )
              }
              className="h-9 px-4 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-50"
            >
              {linkDocument.isPending ? 'Adding...' : 'Add link'}
            </button>
          </div>
          {linkDocument.isError && <p className="mt-2 text-sm text-danger">{linkDocument.error instanceof Error ? linkDocument.error.message : 'Could not add the link.'}</p>}
        </Card>
      )}
      {uploadError && <p className="text-sm font-medium text-danger">{uploadError}</p>}
      <TabTable>
        <thead>
          <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
            <Th>File</Th>
            <Th right>Size</Th>
            <Th>Date</Th>
            <Th right>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {!data || data.documents.length === 0 ? (
            <EmptyRow span={4} label="No documents found" />
          ) : (
            data.documents.map((d, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <Td>
                  {d.fileUrl ? (
                    <a href={sameOriginPath(d.fileUrl)} download={d.fileName} className="flex items-center gap-1.5 text-brand hover:underline">
                      <Download size={14} /> {d.fileName}
                    </a>
                  ) : (
                    d.fileName
                  )}
                </Td>
                <Td right muted>
                  {d.size}
                </Td>
                <Td muted>{d.date}</Td>
                <Td right>
                  <button type="button" onClick={() => handleDelete(d.fileName)} className="p-1.5 rounded-md text-danger hover:bg-danger-bg" title="Delete file">
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TabTable>
      {data && data.links.length > 0 && (
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Link</Th>
              <Th>Date</Th>
              <Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {data.links.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <Td>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand hover:underline">
                    <Link2 size={14} /> {l.label || l.url}
                  </a>
                </Td>
                <Td muted>{l.date}</Td>
                <Td right>
                  <button
                    type="button"
                    onClick={() => id && deleteLink.mutate({ id, linkId: l.id })}
                    disabled={deleteLink.isPending}
                    className="p-1.5 rounded-md text-danger hover:bg-danger-bg disabled:opacity-60"
                    title="Remove link"
                  >
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TabTable>
      )}
    </div>
  )
}

// Events tab (agenda_api.php's `events` field) - real llx_actioncomm rows
// for this product (fk_element/elementtype = 'product'), rendered as a
// timeline. Distinct from the Product Card tab's own Activity Timeline
// (useProductDashboard, invoice-based) - this is the product's own agenda.
function EventsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductAgendaEvents(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Events/Agenda" />
  if (isError) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  // product/fapi/agenda.php answers one list; an event of type AC_PRODUCT_MODIFY is a recorded modification of the product, every other type is an
  // event. That split into the classic tab's two cards comes from the type code and has not been compared with the classic tab on a product that has
  // modifications (report row).
  const all = data?.events ?? []
  const modifications = all.filter((e) => e.typeCode === 'AC_PRODUCT_MODIFY')
  const events = all.filter((e) => e.typeCode !== 'AC_PRODUCT_MODIFY')
  const statusTone: Record<string, 'success' | 'info'> = { success: 'success', info: 'info', warning: 'info', secondary: 'info' }

  const list = (rows: typeof all, empty: string) =>
    rows.length === 0 ? (
      <p className="text-sm text-text-faint text-center py-6">{empty}</p>
    ) : (
      <ul>
        {rows.map((e, i) => (
          <li key={e.id} className={`flex items-start gap-3 py-3 ${i !== rows.length - 1 ? 'border-b border-border' : ''}`}>
            <span className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${ICON_STYLES.indigo}`}>
              <Clock size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-text! truncate">{e.label}</p>
                <StatusPill active activeLabel={e.typeLabel} inactiveLabel={e.typeLabel} tone={statusTone[e.status] ?? 'info'} />
              </div>
              <p className="text-xs text-text-faint mt-0.5">
                {e.date}
                {e.dateEnd && e.dateEnd !== e.date ? ` - ${e.dateEnd}` : ''}
                {e.userName && ` · ${e.userName}`}
                {e.percent > 0 && ` · ${e.percent}%`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile icon={CalendarClock} color="blue" label="Events" value={events.length} />
        <MetricTile icon={History} color="green" label="Modifications" value={modifications.length} />
        <MetricTile icon={Clock} color="amber" label="Latest Event" value={events[0]?.date || '-'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <SectionHeader icon={CalendarClock} color="indigo">
            Events Timeline
          </SectionHeader>
          {list(events, 'No events found')}
        </Card>
        <Card className="!h-auto">
          <SectionHeader icon={History} color="green">
            Modification History
          </SectionHeader>
          {list(modifications, 'No modifications found')}
        </Card>
      </div>
    </div>
  )
}

// The classic margins page prints amounts to up to 4 decimals (0.8621, 13.7505) and the quantity with 2.
const marginAmount = (v: number | null | undefined) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(v ?? 0))

// Margins tab (margin/tabs/productMargins.php) - per-invoice selling vs
// buying price breakdown. No Margin Rate/Mark Rate columns: both
// DISPLAY_MARGIN_RATES and DISPLAY_MARK_RATES are unset on this install
// (confirmed live), matching what legacy itself shows here.
function MarginsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductMargins(id)
  if (isLoading) return <LegacyLoadingCard label="Loading margins..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Margins" />
  if (isError) return <LegacyErrorCard title="Couldn't load margins" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  // Lines without a buying price recorded at the time of sale fall back to the
  // product's current average cost; with that at 0 the margin is the whole revenue.
  const basis = data?.costBasis
  const estimatedLines = basis ? basis.linesTotal - basis.linesWithRecordedCost : 0
  return (
    <div>
      <p className="text-sm mb-4">
        <span className="text-text-faint">Total Margin</span> <span className="text-text! font-medium">{marginAmount(data?.totals.margin ?? 0)}</span>
      </p>
      {basis && estimatedLines > 0 && (
        <p className="text-xs text-warning mb-3 flex items-center gap-1.5">
          <AlertTriangle size={13} />
          {estimatedLines} of {basis.linesTotal} lines have no buying price recorded at the time of sale; they use the current average cost ({marginAmount(basis.currentPmp)})
          {basis.currentPmp === 0 ? ', which is 0, so their margin is unknown rather than 100%.' : '.'}
        </p>
      )}
      <TabTable>
        <thead>
          <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
            <Th>Invoice</Th>
            <Th>Company</Th>
            <Th>Customer code</Th>
            <Th>Date</Th>
            <Th right>Selling price</Th>
            <Th right>Buying price</Th>
            <Th right>Qty</Th>
            <Th right>Margin</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {!data || data.lines.length === 0 ? (
            <EmptyRow span={9} label="No margin data for this product." />
          ) : (
            // One invoice can carry the product on several lines, so the id alone is not a key.
            data.lines.map((l, i) => (
              <tr key={`${l.invoiceId}-${i}`} className="border-b border-border last:border-0">
                <Td muted>{l.ref}</Td>
                <Td>{l.customerName}</Td>
                <Td muted>{l.customerCode || '—'}</Td>
                <Td muted>{l.date}</Td>
                <Td right muted>
                  {marginAmount(l.sellingPrice)}
                </Td>
                <Td right muted>
                  {marginAmount(l.buyingPrice)}
                </Td>
                <Td right muted>
                  {l.qty.toFixed(2)}
                </Td>
                <Td right>{marginAmount(l.margin)}</Td>
                <Td muted>{l.paid === null ? '—' : l.paid ? 'Paid' : 'Unpaid'}</Td>
              </tr>
            ))
          )}
        </tbody>
        {data && data.lines.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={4} className="px-3 py-2 font-semibold text-text! text-right">
                Total:
              </td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{marginAmount(data.totals.sellingPrice)}</td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{marginAmount(data.totals.buyingPrice)}</td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{formatNumber(data.totals.qty)}</td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{marginAmount(data.totals.margin)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </TabTable>
    </div>
  )
}

type LazyTabRendererProps = {
  tab: Tab
  id: string | undefined
}

export function LazyTabRenderer({ tab, id }: LazyTabRendererProps) {
  switch (tab) {
    case 'Selling Prices':
      return <SellingPricesTab id={id} />
    case 'Supplier Prices':
      return <BuyingPricesTab id={id} />
    case 'Stock':
      return <StockTab id={id} />
    case 'UOM':
      return <UomSettingsTab id={id} />
    case 'Variants':
      return <ProductCombinationsTab id={id} />
    case 'Composition':
      return <AssociatedProductsTab id={id} />
    case 'Statistics':
      return <StatisticsTab id={id} />
    case 'Invoice Stats':
      return <InvoiceStatsTab id={id} />
    case 'Notes':
      return <NotesTab id={id} />
    case 'Documents':
      return <LinkedFilesTab id={id} />
    case 'Events':
      return <EventsTab id={id} />
    case 'Margins':
      return (
        <Card className="!h-auto">
          <MarginsTab id={id} />
        </Card>
      )
    default:
      return null
  }
}
