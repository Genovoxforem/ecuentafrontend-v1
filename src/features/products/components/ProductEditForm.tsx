// "Modify Product" wizard (Product / Classification / Stock & Shipping / Organize) on JSON only:
// product/fapi/edit_form.php gives the current values, every dropdown and the write contract
// (which fields the update accepts), and the save goes to product/fapi/product.php?action=update
// with just the fields that changed. Since 16 Oct 2026 that includes what only the classic wizard stored
// (nature of product, packing, default warehouse, manufacturers, the intra/export accounting codes, net
// measure, the ZRA manufacturer details). Reuses ProductServiceCreateForm's
// Field/Select/ClassificationSearch/CategoryMultiSelect so it looks and behaves the same.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, LoaderCircle, PenSquare } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell, WizardStepper } from '../../../shared/components/layout/StickyFormShell'
import { ROUTES } from '../../../routes'
import { useProductEditForm, useUpdateProduct } from '../products.queries'
import type { ProductWriteFields } from '../../../api/products'
import { Field, Select, ClassificationSearch, CategoryMultiSelect, inputCls, selectCls } from './ProductServiceCreateForm'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const EDIT_WIZARD_STEPS = [
  { title: 'Product', subtitle: 'Basic info' },
  { title: 'Classification', subtitle: 'Details' },
  { title: 'Stock & Shipping', subtitle: 'Inventory' },
  { title: 'Organize', subtitle: 'Categories' },
] as const

// The form's values, keyed by the API's own field names (all strings while editing).
type Values = Record<string, string>
const NUMERIC = new Set(['finished', 'packing', 'default_warehouse_id', 'net_measure', 'net_measure_units', 'status_to_sell', 'status_to_buy', 'fk_country', 'fk_unit', 'duration_value', 'seuil_stock_alerte', 'desiredstock', 'weight', 'weight_units', 'length', 'width', 'height', 'length_units', 'width_units', 'height_units', 'rrp'])
const TEXT_FIELDS = ['ref', 'label', 'description', 'note_public', 'note_private', 'barcode', 'itemclassification', 'duration_unit', 'accountancy_code_sell', 'accountancy_code_buy', 'url', 'customcode', 'manufacturer_tpin', 'manufacturer_item_code', 'accountancy_code_sell_intra', 'accountancy_code_sell_export', 'accountancy_code_buy_intra', 'accountancy_code_buy_export']
const NUM_FIELDS = ['finished', 'packing', 'default_warehouse_id', 'net_measure', 'net_measure_units', 'status_to_sell', 'status_to_buy', 'fk_country', 'fk_unit', 'duration_value', 'seuil_stock_alerte', 'desiredstock', 'weight', 'weight_units', 'length', 'width', 'height', 'length_units', 'rrp']

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const SELL = [
  { value: '1', label: 'On sale' },
  { value: '0', label: 'Not for sale' },
]
const BUY = [
  { value: '1', label: 'On purchase' },
  { value: '0', label: 'Not for purchase' },
]
const asOptions = (list: unknown[] | null | undefined) =>
  (list ?? []).map((o) => {
    const r = o as { value: string | number; label?: string; code?: string }
    return { value: String(r.value), label: r.label ?? r.code ?? String(r.value) }
  })

export function ProductEditForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useProductEditForm(id)
  const updateProduct = useUpdateProduct()
  const detailPath = ROUTES.productDetail.replace(':id', id ?? '')

  const [step, setStep] = useState(0)
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState(false)
  const [values, setValues] = useState<Values>({})
  const [original, setOriginal] = useState<Values>({})
  const [sizeUnit, setSizeUnit] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [originalCategories, setOriginalCategories] = useState<string[]>([])
  const [classificationDisplay, setClassificationDisplay] = useState('')
  const [manufacturerIds, setManufacturerIds] = useState<string[]>([])
  const [originalManufacturers, setOriginalManufacturers] = useState<string[]>([])

  useEffect(() => {
    if (!data) return
    const p = data.product
    const v: Values = {}
    for (const key of [...TEXT_FIELDS, ...NUM_FIELDS]) v[key] = str(p[key])
    setValues(v)
    setOriginal(v)
    setSizeUnit(str(p.length_units))
    setClassificationDisplay(str(p.itemclassification))
    const assigned = (data.categories.assigned ?? []).map((a) => String(typeof a === 'object' && a !== null ? (a as { value: number }).value : a))
    setCategoryIds(assigned)
    setOriginalCategories(assigned)
    const makers = ((p.manufacturer_ids as unknown[] | undefined) ?? []).map(String)
    setManufacturerIds(makers)
    setOriginalManufacturers(makers)
  }, [data])

  const set = (key: string) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }))
  const bind = (key: string) => ({ value: values[key] ?? '', onChange: (e: { target: { value: string } }) => set(key)(e.target.value) })

  const options = useMemo(
    () => ({
      countries: asOptions(data?.options.countries),
      units: asOptions(data?.options.units),
      durationUnits: asOptions(data?.options.duration_units),
      measuring: asOptions(data?.options.measuring_units),
      nature: asOptions((data?.options as { nature?: unknown[] } | undefined)?.nature),
      warehouses: asOptions((data?.options as { warehouses?: unknown[] } | undefined)?.warehouses),
      manufacturers: asOptions((data?.options as { manufacturers?: unknown[] } | undefined)?.manufacturers),
      categories: (data?.categories.available ?? []).map((c) => ({ value: String(c.value), label: c.label })),
    }),
    [data],
  )

  if (isLoading) return <LegacyLoadingCard label="Loading product for editing…" />
  if (isError) return <LegacyErrorCard title="Couldn't load the edit form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  const isService = Number(data.product.type) === 1
  const isLastStep = step === EDIT_WIZARD_STEPS.length - 1
  const readOnly = !data.can_edit

  function goNext() {
    setSaveError('')
    if (step === 0) {
      if (!values.label?.trim()) return setSaveError('Label is required!')
      if (!values.ref?.trim()) return setSaveError('Ref. (SKU) is required!')
    }
    setStep((s) => Math.min(s + 1, EDIT_WIZARD_STEPS.length - 1))
  }

  async function handleSubmit() {
    setSaveError('')
    if (!values.label?.trim()) return setSaveError('Label is required!')
    if (!values.ref?.trim()) return setSaveError('Ref. (SKU) is required!')

    // Only the fields the user changed, converted to what the API stores (numbers or null for an emptied number).
    const fields: ProductWriteFields = {}
    for (const key of [...TEXT_FIELDS, ...NUM_FIELDS]) {
      if ((values[key] ?? '') === (original[key] ?? '')) continue
      fields[key] = NUMERIC.has(key) ? (values[key] === '' ? null : Number(values[key])) : values[key]
    }
    if (sizeUnit !== str(data!.product.length_units)) {
      fields.length_units = Number(sizeUnit)
      fields.width_units = Number(sizeUnit)
      fields.height_units = Number(sizeUnit)
    }
    if ([...manufacturerIds].sort().join(',') !== [...originalManufacturers].sort().join(',')) fields.manufacturer_id = manufacturerIds.map(Number)
    if ([...categoryIds].sort().join(',') !== [...originalCategories].sort().join(',')) fields.categories = categoryIds.map(Number)
    // Only what the contract lists as writable (a read-only field can never reach the call).
    for (const key of Object.keys(fields)) if (!data!.writable.includes(key) && key !== 'categories') delete fields[key]

    try {
      await updateProduct.mutateAsync({ id: id!, fields })
      setSuccess(true)
      setTimeout(() => navigate(detailPath), 700)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Connection error while saving — please try again.')
    }
  }

  const stepContent = [
    // Step 1: Product
    <Card key="0" className="!h-auto">
      <div className="grid grid-cols-1 gap-4">
        <Field label="Label" required>
          <input {...bind('label')} className={inputCls} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ref. (SKU)" required>
            <input {...bind('ref')} className={inputCls} />
          </Field>
          <Field label="Barcode value">
            <input {...bind('barcode')} className={inputCls} />
          </Field>
        </div>
        <Field label="Description">
          <textarea {...bind('description')} rows={3} className={inputCls + ' h-auto py-2'} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Public note">
            <textarea {...bind('note_public')} rows={2} className={inputCls + ' h-auto py-2'} />
          </Field>
          <Field label="Private note">
            <textarea {...bind('note_private')} rows={2} className={inputCls + ' h-auto py-2'} />
          </Field>
        </div>
      </div>
    </Card>,

    // Step 2: Classification
    <Card key="1" className="!h-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Status (Sell)" required>
          <Select value={values.status_to_sell ?? ''} onChange={set('status_to_sell')} options={SELL} placeholder="—" />
        </Field>
        <Field label="Status (Buy)" required>
          <Select value={values.status_to_buy ?? ''} onChange={set('status_to_buy')} options={BUY} placeholder="—" />
        </Field>
        <Field label="Product Classification">
          <ClassificationSearch
            value={classificationDisplay}
            code={values.itemclassification ?? ''}
            onSelect={(display, code) => {
              setClassificationDisplay(display)
              set('itemclassification')(code)
            }}
          />
        </Field>
        <Field label="Country of Origin">
          <Select value={values.fk_country ?? ''} onChange={set('fk_country')} options={options.countries} placeholder="—" />
        </Field>
        {isService && (
          <Field label="Duration">
            <div className="flex gap-2">
              <input {...bind('duration_value')} className={inputCls} />
              <select value={values.duration_unit ?? ''} onChange={(e) => set('duration_unit')(e.target.value)} className={selectCls + ' w-28'}>
                <option value="" />
                {options.durationUnits.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        )}
        <Field label="Nature of product">
          <Select value={values.finished ?? ''} onChange={set('finished')} options={options.nature} placeholder="—" />
        </Field>
        <Field label="RRP">
          <input {...bind('rrp')} className={inputCls} />
        </Field>
        {options.manufacturers.length > 0 && (
          <Field label="Manufacturer(s)">
            <CategoryMultiSelect value={manufacturerIds} onChange={setManufacturerIds} options={options.manufacturers} />
          </Field>
        )}
        <Field label="Manufacturer TPIN" hint="ZRA">
          <input {...bind('manufacturer_tpin')} className={inputCls} />
        </Field>
        <Field label="Manufacturer item code" hint="ZRA">
          <input {...bind('manufacturer_item_code')} className={inputCls} />
        </Field>
        <Field label="Public URL">
          <input {...bind('url')} className={inputCls} />
        </Field>
        <Field label="Customs / Commodity / HS code">
          <input {...bind('customcode')} className={inputCls} />
        </Field>
      </div>
      <div className="mt-3 space-y-1 text-xs text-text-faint">
        <p>Price, VAT and the ZRA tax-category codes are changed on the Selling Prices tab, which keeps the price history.</p>
        {Object.entries(data.readonly).map(([field, why]) => (
          <p key={field}>
            <span className="font-medium text-text-muted">{field}</span>: {why}
          </p>
        ))}
      </div>
    </Card>,

    // Step 3: Stock & Shipping
    <Card key="2" className="!h-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Stock Limit">
          <input {...bind('seuil_stock_alerte')} className={inputCls} />
        </Field>
        <Field label="Desired Stock">
          <input {...bind('desiredstock')} className={inputCls} />
        </Field>
        <Field label="Unit">
          <Select value={values.fk_unit ?? ''} onChange={set('fk_unit')} options={options.units} placeholder="—" />
        </Field>
        <Field label="Packing (quantity per pack)">
          <input {...bind('packing')} className={inputCls} />
        </Field>
        <Field label="Default warehouse">
          <Select value={values.default_warehouse_id ?? ''} onChange={set('default_warehouse_id')} options={options.warehouses} placeholder="—" />
        </Field>
        <Field label="Net measure">
          <div className="flex gap-2">
            <input {...bind('net_measure')} className={inputCls} />
            <select value={values.net_measure_units ?? ''} onChange={(e) => set('net_measure_units')(e.target.value)} className={selectCls + ' w-24'}>
              <option value="" />
              {options.measuring.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Weight">
          <div className="flex gap-2">
            <input {...bind('weight')} className={inputCls} />
            <select value={values.weight_units ?? ''} onChange={(e) => set('weight_units')(e.target.value)} className={selectCls + ' w-24'}>
              <option value="" />
              {options.measuring.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Length x Width x Height">
          <div className="flex gap-2">
            <input {...bind('length')} placeholder="L" className={inputCls} />
            <input {...bind('width')} placeholder="W" className={inputCls} />
            <input {...bind('height')} placeholder="H" className={inputCls} />
            <select value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} className={selectCls + ' w-24'}>
              <option value="" />
              {options.measuring.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </Field>
      </div>
    </Card>,

    // Step 4: Organize
    <Card key="3" className="!h-auto">
      <div className="grid grid-cols-1 gap-4">
        {options.categories.length > 0 && (
          <Field label="Categories">
            <CategoryMultiSelect value={categoryIds} onChange={setCategoryIds} options={options.categories} />
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Sell Code" hint="Accounting">
            <input {...bind('accountancy_code_sell')} className={inputCls} />
          </Field>
          <Field label="Buy Code" hint="Accounting">
            <input {...bind('accountancy_code_buy')} className={inputCls} />
          </Field>
          <Field label="Sell Code (intra-EU)" hint="Accounting">
            <input {...bind('accountancy_code_sell_intra')} className={inputCls} />
          </Field>
          <Field label="Sell Code (export)" hint="Accounting">
            <input {...bind('accountancy_code_sell_export')} className={inputCls} />
          </Field>
          <Field label="Buy Code (intra-EU)" hint="Accounting">
            <input {...bind('accountancy_code_buy_intra')} className={inputCls} />
          </Field>
          <Field label="Buy Code (export)" hint="Accounting">
            <input {...bind('accountancy_code_buy_export')} className={inputCls} />
          </Field>
        </div>
      </div>
    </Card>,
  ]

  return (
    <StickyFormShell
      headerClassName="pt-1.5 pb-2.5"
      header={
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to={detailPath} className="text-text-faint hover:text-text">
                <ArrowLeft size={20} />
              </Link>
              <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
                <PenSquare size={20} className="text-brand" /> Modify {isService ? 'Service' : 'Product'}
              </h2>
            </div>
          </div>
          <WizardStepper steps={EDIT_WIZARD_STEPS} step={step} onStep={setStep} canGoTo={(i) => i <= step} />
        </>
      }
      footerLeft={
        <Link to={detailPath} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          Cancel
        </Link>
      }
      footerRight={
        <>
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
              <ChevronLeft size={14} /> Previous
            </button>
          )}
          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={updateProduct.isPending || readOnly}
              title={readOnly ? 'You do not have the right to modify this product' : undefined}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {updateProduct.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
              {updateProduct.isPending ? 'Saving…' : 'Save Product'}
            </button>
          ) : (
            <button type="button" onClick={goNext} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Next <ChevronRight size={14} />
            </button>
          )}
        </>
      }
    >
      <div className="flex-1 flex flex-col gap-4 min-w-0 shrink-0">
        {success && <Card className="!h-auto shrink-0 !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Saved — returning to the product…</Card>}
        {saveError && <Card className="!h-auto shrink-0 !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{saveError}</Card>}
        {stepContent[step]}
      </div>
    </StickyFormShell>
  )
}
