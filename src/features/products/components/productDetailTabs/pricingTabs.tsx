import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Tag, Trash2, Truck, Star } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { formatMoney, formatNumber } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../LegacyReportStates'
import { useProductSupplierOverview, useProductPriceOverview, useDeletePriceLog, useUpdateProductPrice, type ProductPriceOverview } from '../../products.queries'
import { Th, Td, EmptyRow, SectionIcon, SectionHeader, MetricTile, ModalShell, ModalField, modalInputCls } from '../ProductDetailShared'

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

export function SellingPricesTab({ id }: { id: string | undefined }) {
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

export function BuyingPricesTab({ id }: { id: string | undefined }) {
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
