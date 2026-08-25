import { useMemo, useState } from 'react'
import { X, LoaderCircle } from 'lucide-react'
import { Field, Select, ClassificationSearch, CategoryMultiSelect, inputCls, selectCls } from '../../products/components/ProductServiceCreateForm'
import { useCreateProduct, useProductFormOptions, type FormOption } from '../../zra/createProduct.queries'

// Compact single-page modal matching the reference layout's own "Add Products" slide-in —
// same real create-product endpoint (useCreateProduct -> POST /api/products/create-full/,
// the same one ProductServiceCreateForm's full page uses) but scoped to the fields that
// page's own handleSubmit() actually validates as required, rather than the full page's much
// larger field set (weight/dimensions, accounting codes, lot/serial, image — none of which
// the reference "Add Products" modal shows either). Manufacture TPIN/Manufacturer item code/
// RRP stay out: they're marked "demo only" on the full page too (no matching param on
// CreateProductFullInput at all) — Barcode type and Tags/categories ARE real fields on that
// interface (barcodeType/categories), so those are included.
// create-full/ only ever returns { status }, never the new row's id (checked in
// useCreateProduct's own mutationFn) — there's no reliable way to hand the caller a real id
// to auto-select, so onCreated is just a "done, close the modal" signal. The product picker
// still picks the new item up on its own once the query-invalidation-triggered refetch
// resolves (useCreateProduct's onSuccess invalidates ['products']).
export function QuickProductCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: options } = useProductFormOptions()
  const createProduct = useCreateProduct()

  const [ref, setRef] = useState('')
  const [label, setLabel] = useState('')
  const [statut, setStatut] = useState('1')
  const [statutBuy, setStatutBuy] = useState('1')
  const [classificationLabel, setClassificationLabel] = useState('')
  const [classificationCode, setClassificationCode] = useState('')
  const [finished, setFinished] = useState('2')
  const [countryId, setCountryId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [stockAlertLimit, setStockAlertLimit] = useState('')
  const [desiredStock, setDesiredStock] = useState('')
  const [units, setUnits] = useState('')
  const [packing, setPacking] = useState('')
  const [price, setPrice] = useState('')
  const [priceBaseType, setPriceBaseType] = useState<'HT' | 'TTC'>('TTC')
  const [priceMin, setPriceMin] = useState('')
  const [vatCategory, setVatCategory] = useState('')
  const [iplCategory, setIplCategory] = useState('')
  const [tourismCategory, setTourismCategory] = useState('')
  const [exciseCategory, setExciseCategory] = useState('')
  const [barcodeType, setBarcodeType] = useState('')
  const [barcode, setBarcode] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  // Visual-only — same as the reference layout's own fields, but there's no matching param
  // anywhere on CreateProductFullInput for any of these three, confirmed by reading that
  // interface directly (not just "not required," genuinely absent). Included for visual
  // parity since that's what was asked for; not sent on submit.
  const [manufactureTpin, setManufactureTpin] = useState('')
  const [manufacturerItemCode, setManufacturerItemCode] = useState('')
  const [rrp, setRrp] = useState('')
  const [error, setError] = useState('')

  const natureOptions = useMemo<FormOption[]>(
    () => [
      { value: '2', label: 'Finished Product' },
      { value: '1', label: 'Raw Material' },
      { value: '3', label: 'Service' },
    ],
    [],
  )

  async function handleSubmit() {
    setError('')
    if (!ref.trim()) return setError('Ref. is required!')
    if (!label.trim()) return setError('Label is required!')
    if (!classificationCode) return setError('Product Classification is required!')
    if (!countryId) return setError('Country of origin is required!')
    if (!units) return setError('Unit is required!')
    if (!packing) return setError('Packaging Unit is required!')
    if (!price) return setError('Selling price is required!')

    try {
      await createProduct.mutateAsync({
        ref: ref.trim(),
        label: label.trim(),
        prodType: 0,
        statut,
        statutBuy,
        finished,
        itemClassification: classificationLabel,
        countryId,
        warehouseId: warehouseId || undefined,
        stockAlertLimit: stockAlertLimit || undefined,
        desiredStock: desiredStock || undefined,
        units,
        packing,
        price,
        priceBaseType,
        priceMin: priceMin || undefined,
        vatCategory: vatCategory || undefined,
        iplCategory: iplCategory || undefined,
        tourismCategory: tourismCategory || undefined,
        exciseCategory: exciseCategory || undefined,
        barcodeType: barcodeType || undefined,
        barcode: barcode || undefined,
        categories: categories.length ? categories : undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text!">Add Products</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Ref." required>
            <input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Label" required>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Status (Sell)" required>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className={selectCls}>
              <option value="1">For sale</option>
              <option value="0">Not for sale</option>
            </select>
          </Field>

          <Field label="Status (Purchase)" required>
            <select value={statutBuy} onChange={(e) => setStatutBuy(e.target.value)} className={selectCls}>
              <option value="1">For purchase</option>
              <option value="0">Not for purchase</option>
            </select>
          </Field>
          <Field label="Product Classification" required>
            <ClassificationSearch
              value={classificationLabel}
              code={classificationCode}
              onSelect={(l, c) => {
                setClassificationLabel(l)
                setClassificationCode(c)
              }}
            />
          </Field>
          <Field label="Nature of product" required>
            <div className="flex items-center gap-4 h-9">
              {natureOptions.map((o) => (
                <label key={o.value} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                  <input type="checkbox" checked={finished === o.value} onChange={() => setFinished(o.value)} className="rounded border-input-border text-brand focus:ring-brand/30" />
                  {o.label}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Country of origin" required>
            <Select value={countryId} onChange={setCountryId} options={options?.countries ?? []} placeholder="Select…" />
          </Field>
          <Field label="Default warehouse">
            <Select value={warehouseId} onChange={setWarehouseId} options={options?.warehouses ?? []} placeholder="Select a warehouse" />
          </Field>
          <Field label="Stock limit for alert">
            <input value={stockAlertLimit} onChange={(e) => setStockAlertLimit(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Desired Stock">
            <input value={desiredStock} onChange={(e) => setDesiredStock(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Unit" required>
            <Select value={units} onChange={setUnits} options={options?.units ?? []} placeholder="Unit of Quantity" />
          </Field>
          <Field label="Packaging Unit" required>
            <Select value={packing} onChange={setPacking} options={options?.packingUnits ?? []} placeholder="Packaging Unit" />
          </Field>

          <Field label="Selling price" required>
            <div className="flex gap-1.5">
              <input value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls + ' flex-1 min-w-0'} placeholder="Price" />
              <div className="flex rounded-md border border-input-border overflow-hidden shrink-0" role="group" aria-label="Price tax basis">
                <button
                  type="button"
                  onClick={() => setPriceBaseType('HT')}
                  className={`px-2 text-xs font-medium transition-colors ${priceBaseType === 'HT' ? 'bg-brand text-white' : 'bg-input-bg text-text-muted hover:bg-surface-hover'}`}
                >
                  Excl. tax
                </button>
                <button
                  type="button"
                  onClick={() => setPriceBaseType('TTC')}
                  className={`px-2 text-xs font-medium transition-colors border-l border-input-border ${priceBaseType === 'TTC' ? 'bg-brand text-white' : 'bg-input-bg text-text-muted hover:bg-surface-hover'}`}
                >
                  Inc. tax
                </button>
              </div>
            </div>
          </Field>
          <Field label="Min. selling price">
            <input value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className={inputCls} />
          </Field>
          <Field label="VAT category Code">
            <Select value={vatCategory} onChange={setVatCategory} options={options?.vatCategories ?? []} placeholder="Select Tax Category" />
          </Field>

          <Field label="IPL category code">
            <Select value={iplCategory} onChange={setIplCategory} options={options?.iplCategories ?? []} placeholder="Select Tax Category" />
          </Field>
          <Field label="Tourism levy Code">
            <Select value={tourismCategory} onChange={setTourismCategory} options={options?.tourismCategories ?? []} placeholder="Select Tax Category" />
          </Field>
          <Field label="Excise tax category code">
            <Select value={exciseCategory} onChange={setExciseCategory} options={options?.exciseCategories ?? []} placeholder="Select Tax Category" />
          </Field>

          <Field label="Manufacture TPIN">
            <input
              value={manufactureTpin}
              onChange={(e) => setManufactureTpin(e.target.value)}
              title="Not sent — no matching param on this endpoint (confirmed absent even on the full product-create page)"
              className={inputCls}
            />
          </Field>
          <Field label="Manufacturer item code">
            <input
              value={manufacturerItemCode}
              onChange={(e) => setManufacturerItemCode(e.target.value)}
              title="Not sent — no matching param on this endpoint (confirmed absent even on the full product-create page)"
              className={inputCls}
            />
          </Field>
          <Field label="RRP">
            <input
              value={rrp}
              onChange={(e) => setRrp(e.target.value)}
              title="Not sent — no matching param on this endpoint (confirmed absent even on the full product-create page)"
              className={inputCls}
            />
          </Field>

          <Field label="Barcode type">
            <Select value={barcodeType} onChange={setBarcodeType} options={options?.barcodeTypes ?? []} placeholder="Code 128" />
          </Field>
          <Field label="Barcode value">
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tags/categories">
            <CategoryMultiSelect value={categories} onChange={setCategories} options={options?.categories ?? []} />
          </Field>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={createProduct.isPending}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {createProduct.isPending && <LoaderCircle size={14} className="animate-spin" />}
            Create Item
          </button>
        </div>
      </div>
    </div>
  )
}
