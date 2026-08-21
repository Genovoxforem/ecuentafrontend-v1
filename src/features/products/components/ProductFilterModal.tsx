import { useEffect, useState } from 'react'
import { Filter, X } from 'lucide-react'
import { useProductFormOptions } from '../../zra/createProduct.queries'
import { CategoryMultiSelect } from './ProductServiceCreateForm'
import { NATURE_OPTIONS } from '../productConstants'
import { DEFAULT_PRODUCT_FILTERS, type ProductFilters } from '../productFilters'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-text-muted">{label}</label>
      {children}
    </div>
  )
}

// Real entities list would come from Dolibarr's multicompany module — this
// install only has one entity (confirmed live: `SELECT * FROM llx_entity`
// returns exactly one row, "Master entity"), so this is a real field with
// a single real option rather than a fake dropdown.
const ENTITY_OPTIONS = [{ value: '1', label: 'Master entity' }]

// Legacy's own "Filter" modal (product/allproducts.php) — see productFilters.ts
// for which of these 9 fields actually filter anything server-side there vs
// here, and why Sell type / Entities are honestly inert on this install.
export function ProductFilterModal({
  open,
  onClose,
  filters,
  onApply,
}: {
  open: boolean
  onClose: () => void
  filters: ProductFilters
  onApply: (filters: ProductFilters) => void
}) {
  const { data: options } = useProductFormOptions()
  const [draft, setDraft] = useState<ProductFilters>(filters)

  // Re-sync the draft whenever the modal is (re)opened, so a previous
  // Cancel doesn't leak into the next open.
  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  if (!open) return null

  const categoryOptions = [{ value: '-2', label: '- Not categorized -' }, ...(options?.categories ?? [])]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-surface border border-border rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h3 className="flex items-center gap-2 text-base font-semibold text-text!">
            <Filter size={16} className="text-brand" /> Filters
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-auto space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldWrap label="Product Categories / Tags">
                <CategoryMultiSelect value={draft.categories} onChange={(v) => setDraft((d) => ({ ...d, categories: v }))} options={categoryOptions} />
              </FieldWrap>
            </div>

            <FieldWrap label="Entities">
              <select value="1" disabled className={selectCls}>
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FieldWrap>

            <FieldWrap label="Product-type">
              <select value={draft.isRrp ? 'rrp' : 'all'} onChange={(e) => setDraft((d) => ({ ...d, isRrp: e.target.value === 'rrp' }))} className={selectCls}>
                <option value="all">All</option>
                <option value="rrp">RRP</option>
              </select>
            </FieldWrap>

            <FieldWrap label="Material Type">
              <select value={draft.finished} onChange={(e) => setDraft((d) => ({ ...d, finished: e.target.value as ProductFilters['finished'] }))} className={selectCls}>
                <option value="-1">All</option>
                {NATURE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FieldWrap>

            <FieldWrap label="Lot/Serial">
              <select value={draft.tobatch} onChange={(e) => setDraft((d) => ({ ...d, tobatch: e.target.value as ProductFilters['tobatch'] }))} className={selectCls}>
                <option value="-1">All</option>
                <option value="0">No</option>
                <option value="1">Lot</option>
                <option value="2">Serial</option>
              </select>
            </FieldWrap>

            <FieldWrap label="Sell type">
              <select value={draft.tosell} onChange={(e) => setDraft((d) => ({ ...d, tosell: e.target.value as ProductFilters['tosell'] }))} className={selectCls}>
                <option value="-1">All</option>
                <option value="1">On Sell</option>
                <option value="0">Not On Sell</option>
              </select>
            </FieldWrap>

            <FieldWrap label="Purchase type">
              <select value={draft.tobuy} onChange={(e) => setDraft((d) => ({ ...d, tobuy: e.target.value as ProductFilters['tobuy'] }))} className={selectCls}>
                <option value="-1">All</option>
                <option value="1">On Purchase</option>
                <option value="0">Not On Purchase</option>
              </select>
            </FieldWrap>

            <FieldWrap label="Stock">
              <select value={draft.stockFilter} onChange={(e) => setDraft((d) => ({ ...d, stockFilter: e.target.value as ProductFilters['stockFilter'] }))} className={selectCls}>
                <option value="-1">All</option>
                <option value="1">Negative Stock</option>
                <option value="2">Empty Stock</option>
                <option value="3">In Stock</option>
              </select>
            </FieldWrap>

            <div className="sm:col-span-2">
              <FieldWrap label="Date Range">
                <div className="flex items-center gap-2">
                  <input type="date" value={draft.dateStart} onChange={(e) => setDraft((d) => ({ ...d, dateStart: e.target.value }))} className={inputCls} />
                  <span className="text-text-faint text-sm shrink-0">to</span>
                  <input type="date" value={draft.dateEnd} onChange={(e) => setDraft((d) => ({ ...d, dateEnd: e.target.value }))} className={inputCls} />
                </div>
              </FieldWrap>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_PRODUCT_FILTERS)}
            className="px-4 py-2 rounded-md text-sm font-medium border border-border text-text hover:bg-surface-hover"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft)
              onClose()
            }}
            className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}
