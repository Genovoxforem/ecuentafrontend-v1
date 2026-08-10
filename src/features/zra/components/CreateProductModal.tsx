import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import {
  useCreateCategory,
  useCreateProduct,
  useProductClassificationSearch,
  useProductFormOptions,
  useProductPrefill,
  type FormOption,
} from '../createProduct.queries'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-sm mb-1 ${required ? 'text-danger' : 'text-brand'}`}>
        {label}
        {required && '*'}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'
const menuCls = 'absolute z-20 w-full max-h-56 overflow-auto rounded-md border border-border bg-surface shadow-lg soft-scrollbar'

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: FormOption[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// Shared "does the dropdown fit below the trigger, or should it open
// upward" check for the custom combobox-style fields below — plain <select>
// elements get this from the browser for free, but these absolutely
// positioned panels don't, and near the bottom of this tall modal they'd
// otherwise render off-screen.
function measureOpenUpward(el: HTMLElement | null, menuHeight = 240) {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  return spaceBelow < menuHeight && spaceAbove > spaceBelow
}

// Real "Product Classification" field is a jQuery UI autocomplete over
// productclassification.php (see product_off.php) — ported here as a plain
// text input + live results list backed by /zra/product-classifications/,
// the same real llx_c_productclassification search.
function ClassificationSearch({ value, code, onSelect }: { value: string; code: string; onSelect: (label: string, code: string) => void }) {
  const [term, setTerm] = useState(value)
  const [debounced, setDebounced] = useState(value)
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => setTerm(value), [value])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250)
    return () => clearTimeout(t)
  }, [term])

  const { data: results, isFetching } = useProductClassificationSearch(debounced)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setOpenUpward(measureOpenUpward(boxRef.current))
          setOpen(true)
        }}
        placeholder="Search Classification Code.."
        className={inputCls}
      />
      {code && <p className="text-xs text-text-faint mt-1">Code: {code}</p>}
      {open && debounced.trim().length >= 2 && (
        <div className={`${menuCls} ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {isFetching && <p className="px-3 py-2 text-xs text-text-faint">Searching…</p>}
          {!isFetching && (results?.length ?? 0) === 0 && <p className="px-3 py-2 text-xs text-text-faint">No matches.</p>}
          {results?.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onSelect(`${r.code}_${r.label}`, r.code)
                setTerm(`${r.code}_${r.label}`)
                setOpen(false)
              }}
              className="block w-full text-left px-3 py-2 text-xs text-text hover:bg-surface-hover"
            >
              <span className="font-medium">{r.code}</span> — {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Real accountancy code fields (Product Accountancy Sell/Buy/Export Codes)
// are FormAccounting::select_account() — a searchable dropdown over the real
// chart of accounts (e.g. "5017 - Sales"), not free text. Same combobox
// shape as ClassificationSearch, but filtering the already-loaded
// accountingAccounts list client-side instead of hitting a search endpoint —
// there's only ~370 accounts, small enough to load once with the rest of
// product-form-options.
function ComboboxSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: FormOption[]; placeholder: string }) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
        setTerm('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggleOpen() {
    if (!open) setOpenUpward(measureOpenUpward(boxRef.current))
    setOpen((v) => !v)
  }

  const filtered = term.trim() ? options.filter((o) => o.label.toLowerCase().includes(term.trim().toLowerCase())) : options

  return (
    <div className="relative" ref={boxRef}>
      <button type="button" onClick={toggleOpen} className={selectCls + ' text-left flex items-center justify-between gap-2'}>
        <span className={`truncate ${selected ? 'text-text' : 'text-text-faint'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className="text-text-faint shrink-0" />
      </button>
      {open && (
        <div className={`${menuCls} ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search…"
            className="w-full px-3 py-2 text-xs border-b border-border bg-transparent outline-none text-text"
          />
          <button
            type="button"
            onClick={() => {
              onChange('')
              setOpen(false)
              setTerm('')
            }}
            className="block w-full text-left px-3 py-2 text-xs text-text-faint hover:bg-surface-hover"
          >
            {placeholder}
          </button>
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
                setTerm('')
              }}
              className={`block w-full text-left px-3 py-2 text-xs hover:bg-surface-hover ${o.value === value ? 'bg-brand/10 text-brand font-medium' : 'text-text'}`}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-2 text-xs text-text-faint">No matches.</p>}
        </div>
      )}
    </div>
  )
}

// Real "Create tag/category" modal (see product_off.php's #exampleCat +
// #insert_prodcat form) — Name/Is Sub Category/Description, submitted via
// product/ajax/products.php?action=save_categories (useCreateCategory).
function CreateCategoryModal({ categories, onClose, onCreated }: { categories: FormOption[]; onClose: () => void; onCreated: (categoryId: string) => void }) {
  const createCategory = useCreateCategory()
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  async function handleCreate() {
    setError('')
    if (!name.trim()) return setError('Name is required!')
    try {
      const result = await createCategory.mutateAsync({ label: name.trim(), description: description.trim() || undefined, parentId: parentId || undefined })
      onCreated(result.categoryId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the category — please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-base font-semibold text-text!">Create tag/category</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Is Sub Category">
              <Select value={parentId} onChange={setParentId} options={categories} placeholder="None" />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls + ' h-auto py-2'} />
          </Field>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={createCategory.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
          >
            {createCategory.isPending ? 'Creating…' : 'Create this tag/category'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Real "Tags/categories" field is a select2 multiselect over
// select_all_categories() (hierarchical "Parent >> Child" labels, click to
// toggle, "+ Add New" row that opens the create-category modal above) — not
// a native <select multiple>, which renders as a permanently-open listbox
// instead of a closed dropdown.
function CategoryMultiSelect({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: FormOption[] }) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggleOpen() {
    if (!open) setOpenUpward(measureOpenUpward(boxRef.current, 280))
    setOpen((v) => !v)
  }

  function toggleValue(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  return (
    <div className="relative" ref={boxRef}>
      <button type="button" onClick={toggleOpen} className={selectCls + ' text-left flex items-center justify-between gap-2'}>
        <span className={`truncate ${selectedLabels.length ? 'text-text' : 'text-text-faint'}`}>
          {selectedLabels.length ? selectedLabels.join(', ') : 'Search or add a tag/category…'}
        </span>
        <ChevronDown size={14} className="text-text-faint shrink-0" />
      </button>
      {open && (
        <div className={`${menuCls} ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {options.map((o) => {
            const isSelected = value.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleValue(o.value)}
                className={`block w-full text-left px-3 py-2 text-xs hover:bg-surface-hover ${isSelected ? 'bg-brand text-white hover:bg-brand' : 'text-text'}`}
              >
                {o.label}
              </button>
            )
          })}
          {options.length === 0 && <p className="px-3 py-2 text-xs text-text-faint">No categories yet.</p>}
          <button
            type="button"
            onClick={() => {
              setShowCreate(true)
              setOpen(false)
            }}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-brand border-t border-border hover:bg-surface-hover"
          >
            <Plus size={12} /> Add New
          </button>
        </div>
      )}
      {showCreate && (
        <CreateCategoryModal
          categories={options}
          onClose={() => setShowCreate(false)}
          onCreated={(categoryId) => {
            onChange([...value, categoryId])
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}

export function CreateProductModal({ taskCode, onClose, onCreated }: { taskCode: string; onClose: () => void; onCreated: () => void }) {
  const createProduct = useCreateProduct()
  const { data: prefill, isLoading: prefillLoading } = useProductPrefill(taskCode)
  const { data: options, isLoading: optionsLoading } = useProductFormOptions()

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
  const [priceMin, setPriceMin] = useState('')
  const [vatCategory, setVatCategory] = useState('')
  const [iplCategory, setIplCategory] = useState('')
  const [tourismCategory, setTourismCategory] = useState('')
  const [exciseCategory, setExciseCategory] = useState('')
  const [barcodeType, setBarcodeType] = useState('')
  const [barcode, setBarcode] = useState('')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [surface, setSurface] = useState('')
  const [volume, setVolume] = useState('')
  const [accountancySell, setAccountancySell] = useState('')
  const [accountancySellExport, setAccountancySellExport] = useState('')
  const [accountancyBuy, setAccountancyBuy] = useState('')
  const [accountancyBuyExport, setAccountancyBuyExport] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [isWebsite, setIsWebsite] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!prefill) return
    setRef((cur) => cur || prefill.ref)
    setLabel((cur) => cur || prefill.label)
    setCountryId((cur) => cur || prefill.countryId)
    // get_importproduct derives qty_unit/pack_unit by looking up the
    // ASYCUDA declaration's own unit code (qtyUnitCd/pkgUnitCd) in
    // llx_c_units — when that code doesn't match any real row (seen live:
    // qtyUnitCd "N/A" produces qty_unit " ()", a blank-but-nonempty string),
    // only accept it if it's a real "<rowid> (<code>)" match, so it lines up
    // with an actual <option> instead of silently submitting a dead value.
    if (/^\d+\s\(.+\)$/.test(prefill.qtyUnit)) setUnits((cur) => cur || prefill.qtyUnit)
    if (/^\d+\s\(.+\)$/.test(prefill.packUnit)) setPacking((cur) => cur || prefill.packUnit)
  }, [prefill])

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
    if (!statut) return setError('Status (Sell) is required!')
    if (!statutBuy) return setError('Status (Purchase) is required!')
    if (!finished) return setError('Nature of product is required!')
    if (!price) return setError('Selling price is required!')

    try {
      await createProduct.mutateAsync({
        ref: ref.trim(),
        label: label.trim(),
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
        priceMin: priceMin || undefined,
        vatCategory: vatCategory || undefined,
        iplCategory: iplCategory || undefined,
        tourismCategory: tourismCategory || undefined,
        exciseCategory: exciseCategory || undefined,
        barcodeType: barcodeType || undefined,
        barcode: barcode || undefined,
        weight: weight || undefined,
        length: length || undefined,
        width: width || undefined,
        height: height || undefined,
        surface: surface || undefined,
        volume: volume || undefined,
        accountancySell: accountancySell || undefined,
        accountancySellExport: accountancySellExport || undefined,
        accountancyBuy: accountancyBuy || undefined,
        accountancyBuyExport: accountancyBuyExport || undefined,
        categories: categories.length ? categories : undefined,
        isWebsite,
        taskCode,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error while creating the product — please try again.')
    }
  }

  const loading = prefillLoading || optionsLoading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[96rem] max-h-[97vh] flex flex-col overflow-hidden bg-surface border border-border rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border shrink-0">
          <h3 className="text-lg font-semibold text-text!">Add Products</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          <p className="text-xs text-text-faint">
            From ASYCUDA task code <span className="text-text">{taskCode}</span>.{loading && ' Loading real item details…'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-2.5 items-start">
            <Field label="Ref." required>
              <input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Label" required>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Status (Sell)" required>
              <select value={statut} onChange={(e) => setStatut(e.target.value)} className={selectCls}>
                <option value="1">On Sell</option>
                <option value="0">Not On Sell</option>
              </select>
            </Field>
            <Field label="Status (Purchase)" required>
              <select value={statutBuy} onChange={(e) => setStatutBuy(e.target.value)} className={selectCls}>
                <option value="1">On Purchase</option>
                <option value="0">Not On Purchase</option>
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
              <Select value={finished} onChange={setFinished} options={natureOptions} placeholder="Select…" />
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
              <Select value={units} onChange={setUnits} options={options?.units ?? []} placeholder="Select…" />
            </Field>
            <Field label="Packaging Unit" required>
              <Select value={packing} onChange={setPacking} options={options?.packingUnits ?? []} placeholder="Select…" />
            </Field>

            <Field label="Selling price" required>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
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
            <Field label="Barcode type">
              <Select value={barcodeType} onChange={setBarcodeType} options={options?.barcodeTypes ?? []} placeholder="Select…" />
            </Field>
            <Field label="Barcode value">
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={inputCls} />
            </Field>

            <Field label="Weight (kg)">
              <input value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Length x Width x Height">
              <div className="flex items-center gap-1">
                <input value={length} onChange={(e) => setLength(e.target.value)} className={inputCls} />
                <span className="text-text-faint">x</span>
                <input value={width} onChange={(e) => setWidth(e.target.value)} className={inputCls} />
                <span className="text-text-faint">x</span>
                <input value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} />
              </div>
            </Field>
            <Field label="Area (m²)">
              <input value={surface} onChange={(e) => setSurface(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Volume (m³)">
              <input value={volume} onChange={(e) => setVolume(e.target.value)} className={inputCls} />
            </Field>

            <Field label="Product Accountancy Sell Code">
              <ComboboxSelect value={accountancySell} onChange={setAccountancySell} options={options?.accountingAccounts ?? []} placeholder="Select an account" />
            </Field>
            <Field label="Product Accountancy Sell Export Code">
              <ComboboxSelect value={accountancySellExport} onChange={setAccountancySellExport} options={options?.accountingAccounts ?? []} placeholder="Select an account" />
            </Field>
            <Field label="Product Accountancy Buy Code">
              <ComboboxSelect value={accountancyBuy} onChange={setAccountancyBuy} options={options?.accountingAccounts ?? []} placeholder="Select an account" />
            </Field>
            <Field label="Product Accountancy Buy Export Code">
              <ComboboxSelect value={accountancyBuyExport} onChange={setAccountancyBuyExport} options={options?.accountingAccounts ?? []} placeholder="Select an account" />
            </Field>

            <Field label="Tags/categories">
              <CategoryMultiSelect value={categories} onChange={setCategories} options={options?.categories ?? []} />
            </Field>
            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-1 text-sm text-brand">Enable On Website</label>
              <button
                type="button"
                onClick={() => setIsWebsite((v) => !v)}
                className={`w-9 h-5 rounded-full transition-colors ${isWebsite ? 'bg-brand' : 'bg-surface-alt'}`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${isWebsite ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}
        </div>

        <div className="px-5 py-2.5 border-t border-border shrink-0 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createProduct.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
          >
            {createProduct.isPending ? 'Creating…' : 'Create Products'}
          </button>
        </div>
      </div>
    </div>
  )
}
