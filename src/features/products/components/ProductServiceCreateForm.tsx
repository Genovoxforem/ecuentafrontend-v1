import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, ChevronDown, Globe, ImageUp, Package, PlusCircle, Settings2, Tags, Truck, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import {
  useCreateCategory,
  useCreateProduct,
  useProductClassificationSearch,
  useProductFormOptions,
  type FormOption,
} from '../../zra/createProduct.queries'

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-sm mb-1 ${required ? 'text-danger' : 'text-text-muted'}`}>
        {label}
        {required && '*'}
        {hint && <span className="ml-1 text-[10px] font-normal text-text-faint italic">({hint})</span>}
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

function measureOpenUpward(el: HTMLElement | null, menuHeight = 240) {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  return spaceBelow < menuHeight && spaceAbove > spaceBelow
}

// Real "Product Classification" field — jQuery UI autocomplete over
// productclassification.php in the legacy app, ported as a text input +
// live results backed by /zra/product-classifications/ (real
// llx_c_productclassification search). Doubles as the legacy form's
// "Customs/Commodity/HS code" concept — that's what this table is.
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
            <PlusCircle size={12} /> Add New
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

// "hint" mirrors Field's — fields with no backing column on this backend's
// /api/products/create-full/ endpoint (confirmed against its real field
// list) are marked "demo only" right on their own label instead of a
// separate full-width warning row, so the legacy layout isn't missing
// pieces without burning a whole grid row per section for the disclaimer.
function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2 h-9">
      <button type="button" onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}>
        <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      <span className="text-sm text-text">
        {label}
        {hint && <span className="ml-1 text-[10px] text-text-faint italic">({hint})</span>}
      </span>
    </div>
  )
}

function SectionCard({ title, cols = 3, children }: { title: string; cols?: 3 | 4; children: React.ReactNode }) {
  return (
    <Card className="!h-auto">
      <h3 className="font-semibold text-text! mb-3">{title}</h3>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-x-4 gap-y-3 items-start`}>{children}</div>
    </Card>
  )
}

// Dimension unit choices — the exact scale-code options Dolibarr's own
// weight_units/size_units/surface_units/volume_units selects offer on the
// legacy Add Products form (pulled straight from that page's rendered
// <option value=…> list, not guessed): 0 = base metric unit, negative =
// smaller metric prefix (kg→g is -3, m→cm is -2, …), 98/99 (and a few
// extras for volume) = imperial. Sent through as-is on submit — see
// CreateProductFullInput's weightUnit/sizeUnit/surfaceUnit/volumeUnit.
const WEIGHT_UNITS: FormOption[] = [
  { value: '3', label: 'ton' },
  { value: '0', label: 'kg' },
  { value: '-3', label: 'g' },
  { value: '-6', label: 'mg' },
  { value: '98', label: 'ounce' },
  { value: '99', label: 'pound' },
]
const SIZE_UNITS: FormOption[] = [
  { value: '0', label: 'm' },
  { value: '-1', label: 'dm' },
  { value: '-2', label: 'cm' },
  { value: '-3', label: 'mm' },
  { value: '98', label: 'foot' },
  { value: '99', label: 'inch' },
]
const SURFACE_UNITS: FormOption[] = [
  { value: '0', label: 'm²' },
  { value: '-2', label: 'dm²' },
  { value: '-4', label: 'cm²' },
  { value: '-6', label: 'mm²' },
  { value: '98', label: 'ft²' },
  { value: '99', label: 'in²' },
]
const VOLUME_UNITS: FormOption[] = [
  { value: '0', label: 'm³' },
  { value: '-3', label: 'dm³ (L)' },
  { value: '-6', label: 'cm³ (ml)' },
  { value: '-9', label: 'mm³ (µl)' },
  { value: '88', label: 'ft³' },
  { value: '89', label: 'in³' },
  { value: '97', label: 'ounce' },
  { value: '98', label: 'litre' },
  { value: '99', label: 'gallon' },
]

function UnitSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: FormOption[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${selectCls} w-24 shrink-0 px-1.5`}>
      {options.map((u) => (
        <option key={u.value} value={u.value}>
          {u.label}
        </option>
      ))}
    </select>
  )
}

const INVENTORY_TABS = [
  { id: 'restock', label: 'Restock', icon: Boxes },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'delivery', label: 'GlobalDelivery', icon: Globe },
  { id: 'attributes', label: 'Attributes', icon: Tags },
  { id: 'advanced', label: 'Advanced', icon: Settings2 },
] as const
type InventoryTab = (typeof INVENTORY_TABS)[number]['id']

export function ProductServiceCreateForm({ prodType }: { prodType: 0 | 1 }) {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()
  const { data: options, isLoading: optionsLoading } = useProductFormOptions()
  const isService = prodType === 1

  const [ref, setRef] = useState('')
  const [label, setLabel] = useState('')
  const [statut, setStatut] = useState('1')
  const [statutBuy, setStatutBuy] = useState('1')
  const [classificationLabel, setClassificationLabel] = useState('')
  const [classificationCode, setClassificationCode] = useState('')
  const [finished, setFinished] = useState(isService ? '3' : '2')
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
  const [barcode, setBarcode] = useState('')
  const [accountancySell, setAccountancySell] = useState('')
  const [accountancySellExport, setAccountancySellExport] = useState('')
  const [accountancyBuy, setAccountancyBuy] = useState('')
  const [accountancyBuyExport, setAccountancyBuyExport] = useState('')
  const [showAccounting, setShowAccounting] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Local-only fields — see LocalOnlyNote above.
  const [description, setDescription] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [manufacturer, setManufacturer] = useState('')
  const [stateProvince, setStateProvince] = useState('')
  const [customsHsCode, setCustomsHsCode] = useState('')
  const [tpin, setTpin] = useState('')
  const [manufacturerItemCode, setManufacturerItemCode] = useState('')
  const [rrp, setRrp] = useState('')
  const [useLotSerial, setUseLotSerial] = useState(false)
  const [publicUrl, setPublicUrl] = useState('')
  const [chargeTax, setChargeTax] = useState(true)
  const [inStock, setInStock] = useState(true)
  const [invTab, setInvTab] = useState<InventoryTab>('restock')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('0')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [sizeUnit, setSizeUnit] = useState('0')
  const [surface, setSurface] = useState('')
  const [surfaceUnit, setSurfaceUnit] = useState('0')
  const [volume, setVolume] = useState('')
  const [volumeUnit, setVolumeUnit] = useState('0')
  const [notePrivate, setNotePrivate] = useState('')

  function handleImageSelect(file: File | undefined) {
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
  }

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
    if (!price) return setError('Base price is required!')

    try {
      await createProduct.mutateAsync({
        ref: ref.trim(),
        label: label.trim(),
        prodType,
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
        // Legacy create form never exposes this as a picker — it's a hidden
        // input hardcoded to 6 (EAN13-family) on every new product.
        barcodeType: '6',
        barcode: barcode || undefined,
        weight: weight || undefined,
        weightUnit: weight ? weightUnit : undefined,
        length: length || undefined,
        width: width || undefined,
        height: height || undefined,
        sizeUnit: length || width || height ? sizeUnit : undefined,
        surface: surface || undefined,
        surfaceUnit: surface ? surfaceUnit : undefined,
        volume: volume || undefined,
        volumeUnit: volume ? volumeUnit : undefined,
        accountancySell: accountancySell || undefined,
        accountancySellExport: accountancySellExport || undefined,
        accountancyBuy: accountancyBuy || undefined,
        accountancyBuyExport: accountancyBuyExport || undefined,
        categories: categories.length ? categories : undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate(isService ? ROUTES.serviceList : ROUTES.productList), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error while creating — please try again.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Package size={20} className="text-brand" /> New {isService ? 'Service' : 'Product'}
        </h2>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createProduct.isPending || optionsLoading}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createProduct.isPending ? 'Saving…' : `Save ${isService ? 'Service' : 'Product'}`}
        </button>
      </div>

      {success && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Created — redirecting to the list…</Card>}
      {error && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error}</Card>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4 items-start">
        <SectionCard title="Product Information">
          <Field label="Label" required>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="ProductTitle" />
          </Field>
          <Field label="Ref. (SKU)" required>
            <input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} placeholder="SKU" />
          </Field>
          <Field label="Barcode value">
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={inputCls} placeholder="0123-4567" />
          </Field>
          <div className="sm:col-span-2 xl:col-span-3">
            <Field label="Description (Optional)">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls + ' h-auto py-2'} placeholder="Product description" />
            </Field>
          </div>
        </SectionCard>

        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Product Image</h3>
          <label className="flex flex-col items-center justify-center gap-2 h-36 rounded-lg border-2 border-dashed border-border hover:border-brand/40 cursor-pointer text-center px-3">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="max-h-32 max-w-full object-contain rounded" />
            ) : (
              <>
                <ImageUp size={22} className="text-text-faint" />
                <span className="text-xs text-text-muted">Drag&amp;drop image here</span>
                <span className="text-[11px] text-text-faint">Max file size: 2M</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e.target.files?.[0])} />
          </label>
          <p className="text-[11px] text-text-faint mt-2">Preview only — no image upload endpoint exists yet, so nothing here is saved.</p>
        </Card>
      </div>

      <SectionCard title="Variants">
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
        <Field label="Nature of product" required>
          <Select value={finished} onChange={setFinished} options={natureOptions} placeholder="Select…" />
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
        <Toggle checked={useLotSerial} onChange={setUseLotSerial} label="Use lot/serial number" hint="demo only" />
        <Field label="Public URL" hint="demo only">
          <input value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} className={inputCls} placeholder="https://…" />
        </Field>
      </SectionCard>

      <SectionCard title="Pricing" cols={4}>
        <Field label="Base price" required>
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
        <Field label="Discounted Price">
          <input value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className={inputCls} placeholder="Min. selling price" />
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
        <Field label="Manufacture TPIN" hint="demo only">
          <input value={tpin} onChange={(e) => setTpin(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Manufacturer item code" hint="demo only">
          <input value={manufacturerItemCode} onChange={(e) => setManufacturerItemCode(e.target.value)} className={inputCls} />
        </Field>
        <Field label="RRP" hint="demo only">
          <input value={rrp} onChange={(e) => setRrp(e.target.value)} className={inputCls} />
        </Field>
        <Toggle checked={chargeTax} onChange={setChargeTax} label="Charge tax on this product" hint="demo only" />
        <Toggle checked={inStock} onChange={setInStock} label="In stock" hint="demo only" />
      </SectionCard>

      <SectionCard title="Organize" cols={4}>
        <Field label="Vendor / Country of origin" required>
          <Select value={countryId} onChange={setCountryId} options={options?.countries ?? []} placeholder="Select…" />
        </Field>
        <Field label="Manufacturer / Vendor" hint="demo only">
          <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={inputCls} />
        </Field>
        <Field label="State/Province of origin" hint="demo only">
          <input value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Customs/Commodity/HS code" hint="demo only">
          <input value={customsHsCode} onChange={(e) => setCustomsHsCode(e.target.value)} className={inputCls} />
        </Field>
        <div className="sm:col-span-2 xl:col-span-4">
          <Field label="Tag/category">
            <CategoryMultiSelect value={categories} onChange={setCategories} options={options?.categories ?? []} />
          </Field>
        </div>
        <div className="sm:col-span-2 xl:col-span-4">
          <button
            type="button"
            onClick={() => setShowAccounting((v) => !v)}
            className={`flex w-full items-center justify-between rounded-md border border-input-border bg-input-bg px-3 h-9 text-sm text-text-muted hover:bg-surface-hover ${showAccounting ? 'rounded-b-none' : ''}`}
          >
            Accounting Codes
            <ChevronDown size={14} className={`transition-transform ${showAccounting ? 'rotate-180' : ''}`} />
          </button>
          {showAccounting && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 rounded-b-md border border-t-0 border-input-border p-3">
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
            </div>
          )}
        </div>
      </SectionCard>

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3">Inventory</h3>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex sm:flex-col gap-1 shrink-0 w-full sm:w-40 overflow-x-auto sm:overflow-visible">
            {INVENTORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInvTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                  invTab === tab.id ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
          <div className="grid flex-1 min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3 items-start">
            {invTab === 'restock' && (
              <>
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
              </>
            )}
            {invTab === 'shipping' && (
              <>
                <Field label="Weight">
                  <div className="flex gap-1.5">
                    <input value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls + ' flex-1 min-w-0'} />
                    <UnitSelect value={weightUnit} onChange={setWeightUnit} options={WEIGHT_UNITS} />
                  </div>
                </Field>
                <Field label="Length">
                  <input value={length} onChange={(e) => setLength(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Width">
                  <input value={width} onChange={(e) => setWidth(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Height">
                  <input value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Size unit" hint="applies to L/W/H">
                  <UnitSelect value={sizeUnit} onChange={setSizeUnit} options={SIZE_UNITS} />
                </Field>
              </>
            )}
            {invTab === 'delivery' && (
              <>
                <Field label="Surface">
                  <div className="flex gap-1.5">
                    <input value={surface} onChange={(e) => setSurface(e.target.value)} className={inputCls + ' flex-1 min-w-0'} />
                    <UnitSelect value={surfaceUnit} onChange={setSurfaceUnit} options={SURFACE_UNITS} />
                  </div>
                </Field>
                <Field label="Volume">
                  <div className="flex gap-1.5">
                    <input value={volume} onChange={(e) => setVolume(e.target.value)} className={inputCls + ' flex-1 min-w-0'} />
                    <UnitSelect value={volumeUnit} onChange={setVolumeUnit} options={VOLUME_UNITS} />
                  </div>
                </Field>
              </>
            )}
            {invTab === 'advanced' && (
              <div className="sm:col-span-2 xl:col-span-3">
                <Field label="Note" hint="private, demo only">
                  <textarea
                    value={notePrivate}
                    onChange={(e) => setNotePrivate(e.target.value)}
                    rows={3}
                    className={inputCls + ' h-auto py-2'}
                    placeholder="Not visible on invoices, quotations…"
                  />
                </Field>
              </div>
            )}
            {invTab === 'attributes' && <p className="sm:col-span-2 xl:col-span-3 py-8 text-center text-xs italic text-text-faint">No attributes configured.</p>}
          </div>
        </div>
      </Card>

    </div>
  )
}
