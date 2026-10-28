import { useState, useEffect } from 'react'
import { Tag, Trash2, Link2, Shapes, Layers, Boxes, Plus, Search, DollarSign } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { formatMoney, formatNumber } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../LegacyReportStates'
import { isBackendUnavailable, isBackendActionUnavailable, BackendUnavailableCard } from '../../../../shared/components/BackendUnavailable'
import { useProductDetail, useProductVariantOverview, useCreateCombination, useDeleteCombination, useProductCompositionOverview, useAddSubproduct, useDeleteSubproduct, useProductSearch, type ProductVariantOverview } from '../../products.queries'
import { Th, Td, EmptyRow, TabTable, SectionHeader, StatusPill, MetricTile, ModalShell, ModalField, modalInputCls } from '../ProductDetailShared'

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
export function ProductCombinationsTab({ id }: { id: string | undefined }) {
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
export function AssociatedProductsTab({ id }: { id: string | undefined }) {
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
