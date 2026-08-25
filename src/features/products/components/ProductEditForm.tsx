// Native rebuild of productinfo/api/edit_wizard.php's real 4-step "Modify
// Product" wizard (Product / Classification / Stock & Shipping / Organize —
// same step split, same fields, confirmed against that real PHP source and
// its live-fetched HTML output, not guessed). Submits to productinfo/api/
// product_api.php?action=update, the same real CRUD API Delete/Duplicate
// already use (see products.queries.ts). Reuses ProductServiceCreateForm's
// already-built Field/Select/ClassificationSearch/CategoryMultiSelect
// components rather than duplicating them — same look, same behavior.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, LoaderCircle, PenSquare } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { ROUTES } from '../../../routes'
import { useProductEditFormData, useUpdateProduct } from '../products.queries'
import type { EditWizardOption } from '../productLegacyParsers'
import { Field, Select, ClassificationSearch, CategoryMultiSelect, inputCls, selectCls } from './ProductServiceCreateForm'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const EDIT_WIZARD_STEPS = [
  { title: 'Product', subtitle: 'Basic info' },
  { title: 'Classification', subtitle: 'Details' },
  { title: 'Stock & Shipping', subtitle: 'Inventory' },
  { title: 'Organize', subtitle: 'Categories' },
] as const

// Some of the real option labels (confirmed live: statut/statut_buy/finished)
// come back as raw, untranslated Dolibarr language keys — e.g. literally
// "OnSell", "FinishedProduct" — rather than resolved text; a real backend
// i18n gap, not something a frontend fix can correct at the source. Adding a
// space before each internal capital ("OnSell" -> "On Sell") is a safe,
// generic readability pass: it's a no-op on labels that already read fine
// (real proper nouns, all-caps codes like "ZM"), so it's applied to every
// option rather than only the ones known to need it.
function humanizeLabel(label: string): string {
  return label.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}
function fmtOptions(options: EditWizardOption[]) {
  return options.filter((o) => o.value !== '').map((o) => ({ value: o.value, label: humanizeLabel(o.label) }))
}

export function ProductEditForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useProductEditFormData(id)
  const updateProduct = useUpdateProduct()
  const detailPath = ROUTES.productDetail.replace(':id', id ?? '')

  const [step, setStep] = useState(0)
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState(false)

  const [label, setLabel] = useState('')
  const [ref, setRef] = useState('')
  const [barcode, setBarcode] = useState('')
  const [description, setDescription] = useState('')
  const [statut, setStatut] = useState('')
  const [statutBuy, setStatutBuy] = useState('')
  const [finished, setFinished] = useState('')
  const [classificationDisplay, setClassificationDisplay] = useState('')
  const [classificationCode, setClassificationCode] = useState('')
  const [countryId, setCountryId] = useState('')
  const [durationValue, setDurationValue] = useState('')
  const [durationUnit, setDurationUnit] = useState('')

  const [warehouseId, setWarehouseId] = useState('')
  const [seuilStockAlerte, setSeuilStockAlerte] = useState('')
  const [desiredStock, setDesiredStock] = useState('')
  const [units, setUnits] = useState('')
  const [packing, setPacking] = useState('')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [sizeUnit, setSizeUnit] = useState('')

  const [manufacturerId, setManufacturerId] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [accountancySell, setAccountancySell] = useState('')
  const [accountancySellExport, setAccountancySellExport] = useState('')
  const [accountancyBuy, setAccountancyBuy] = useState('')
  const [accountancyBuyExport, setAccountancyBuyExport] = useState('')

  useEffect(() => {
    if (!data) return
    setLabel(data.label)
    setRef(data.ref)
    setBarcode(data.barcode)
    setDescription(data.description)
    setStatut(data.statut)
    setStatutBuy(data.statutBuy)
    setFinished(data.finished)
    setClassificationDisplay(data.itemClassification)
    setClassificationCode(data.itemClassification)
    setCountryId(data.countryId)
    setDurationValue(data.durationValue)
    setDurationUnit(data.durationUnit)
    setWarehouseId(data.warehouseId)
    setSeuilStockAlerte(data.seuilStockAlerte)
    setDesiredStock(data.desiredStock)
    setUnits(data.units)
    setPacking(data.packing)
    setWeight(data.weight)
    setWeightUnit(data.weightUnit)
    setLength(data.length)
    setWidth(data.width)
    setHeight(data.height)
    setSizeUnit(data.sizeUnit)
    setManufacturerId(data.manufacturerId)
    setCategoryIds(data.categoryIds)
  }, [data])

  if (isLoading) return <LegacyLoadingCard label="Loading product for editing…" />
  if (isError) return <LegacyErrorCard title="Couldn't load the edit form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  const isService = data.prodType === 1
  const isLastStep = step === EDIT_WIZARD_STEPS.length - 1

  function goNext() {
    setSaveError('')
    if (step === 0) {
      if (!label.trim()) return setSaveError('Label is required!')
      if (!ref.trim()) return setSaveError('Ref. (SKU) is required!')
    }
    setStep((s) => Math.min(s + 1, EDIT_WIZARD_STEPS.length - 1))
  }

  async function handleSubmit() {
    setSaveError('')
    if (!label.trim()) return setSaveError('Label is required!')
    if (!ref.trim()) return setSaveError('Ref. (SKU) is required!')

    try {
      await updateProduct.mutateAsync({
        id: id!,
        label: label.trim(),
        ref: ref.trim(),
        barcode,
        description,
        statut,
        statutBuy,
        finished,
        itemClassification: classificationCode,
        countryId,
        price: data!.hiddenPrice,
        priceMin: data!.hiddenPriceMin,
        priceBaseType: data!.hiddenPriceBaseType,
        tvaTx: data!.hiddenTvaTx,
        iplCatCd: data!.hiddenIplCatCd,
        tlCatCd: data!.hiddenTlCatCd,
        exciseTxCatCd: data!.hiddenExciseTxCatCd,
        manufactuterTpin: data!.manufactuterTpin,
        manufacturerItemCd: data!.manufacturerItemCd,
        rrp: data!.rrp,
        durationValue,
        durationUnit,
        fkDefaultWarehouse: warehouseId,
        seuilStockAlerte,
        desiredStock,
        units,
        packing,
        weight,
        weightUnits: weightUnit,
        length,
        width,
        height,
        sizeUnits: sizeUnit,
        manufacturerId,
        accountancySell,
        accountancySellExport,
        accountancyBuy,
        accountancyBuyExport,
        categories: categoryIds,
      })
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
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ref. (SKU)" required>
            <input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Barcode value">
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls + ' h-auto py-2'} />
        </Field>
      </div>
    </Card>,

    // Step 2: Classification
    <Card key="1" className="!h-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Status (Sell)" required>
          <Select value={statut} onChange={setStatut} options={fmtOptions(data.statutOptions)} placeholder="—" />
        </Field>
        <Field label="Status (Buy)" required>
          <Select value={statutBuy} onChange={setStatutBuy} options={fmtOptions(data.statutBuyOptions)} placeholder="—" />
        </Field>
        <Field label="Nature Of Product">
          <Select value={finished} onChange={setFinished} options={fmtOptions(data.finishedOptions)} placeholder="—" />
        </Field>
        <Field label="Product Classification">
          <ClassificationSearch
            value={classificationDisplay}
            code={classificationCode}
            onSelect={(display, code) => {
              setClassificationDisplay(display)
              setClassificationCode(code)
            }}
          />
        </Field>
        {isService && (
          <Field label="Duration">
            <div className="flex gap-2">
              <input value={durationValue} onChange={(e) => setDurationValue(e.target.value)} className={inputCls} />
              <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className={selectCls + ' w-28'}>
                {fmtOptions(data.durationUnitOptions).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        )}
        <Field label="Country of Origin">
          <Select value={countryId} onChange={setCountryId} options={fmtOptions(data.countryOptions)} placeholder="—" />
        </Field>
        {data.isZra && (
          <>
            <Field label="Manufacture TPIN" hint="ZRA">
              <input value={data.manufactuterTpin} disabled className={inputCls + ' opacity-60'} />
            </Field>
            <Field label="Manufacturer Item Code" hint="ZRA">
              <input value={data.manufacturerItemCd} disabled className={inputCls + ' opacity-60'} />
            </Field>
            <Field label="RRP" hint="ZRA">
              <input value={data.rrp} disabled className={inputCls + ' opacity-60'} />
            </Field>
          </>
        )}
      </div>
      <p className="text-xs text-text-faint mt-3">Price, tax, and ZRA tax-category codes aren't editable from this wizard — same as the real page this mirrors — and are resubmitted unchanged.</p>
    </Card>,

    // Step 3: Stock & Shipping
    <Card key="2" className="!h-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.hasWarehouseSection && (
          <Field label="Default Warehouse">
            <Select value={warehouseId} onChange={setWarehouseId} options={fmtOptions(data.warehouseOptions)} placeholder="—" />
          </Field>
        )}
        {data.hasStockFields && (
          <>
            <Field label="Stock Limit">
              <input value={seuilStockAlerte} onChange={(e) => setSeuilStockAlerte(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Desired Stock">
              <input value={desiredStock} onChange={(e) => setDesiredStock(e.target.value)} className={inputCls} />
            </Field>
          </>
        )}
        <Field label="Default Unit To Show">
          <Select value={units} onChange={setUnits} options={fmtOptions(data.unitsOptions)} placeholder="—" />
        </Field>
        <Field label="Packaging Unit">
          <Select value={packing} onChange={setPacking} options={fmtOptions(data.packingOptions)} placeholder="—" />
        </Field>
        {data.hasShippingFields && (
          <>
            <Field label="Weight">
              <div className="flex gap-2">
                <input value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
                <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className={selectCls + ' w-24'}>
                  {fmtOptions(data.weightUnitOptions).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Length x Width x Height">
              <div className="flex gap-2">
                <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="L" className={inputCls} />
                <input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="W" className={inputCls} />
                <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="H" className={inputCls} />
                <select value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} className={selectCls + ' w-24'}>
                  {fmtOptions(data.sizeUnitOptions).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </>
        )}
      </div>
    </Card>,

    // Step 4: Organize
    <Card key="3" className="!h-auto">
      <div className="grid grid-cols-1 gap-4">
        <Field label="Manufacturer / Vendor">
          <Select value={manufacturerId} onChange={setManufacturerId} options={fmtOptions(data.manufacturerOptions)} placeholder="—" />
        </Field>
        {data.categoryOptions.length > 0 && (
          <Field label="Categories">
            <CategoryMultiSelect value={categoryIds} onChange={setCategoryIds} options={data.categoryOptions} />
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Sell Code" hint="Accounting">
            <input value={accountancySell} onChange={(e) => setAccountancySell(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Sell Export Code" hint="Accounting">
            <input value={accountancySellExport} onChange={(e) => setAccountancySellExport(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Buy Code" hint="Accounting">
            <input value={accountancyBuy} onChange={(e) => setAccountancyBuy(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Buy Export Code" hint="Accounting">
            <input value={accountancyBuyExport} onChange={(e) => setAccountancyBuyExport(e.target.value)} className={inputCls} />
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
          <div className="flex items-center mt-3">
            {EDIT_WIZARD_STEPS.map((s, i) => {
              const isDone = i < step
              const isActive = i === step
              return (
                <div key={s.title} className={`flex items-center ${i < EDIT_WIZARD_STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <button type="button" onClick={() => i <= step && setStep(i)} title={s.subtitle} className="flex items-center gap-2.5 group text-left">
                    <span
                      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                        isDone ? 'bg-success border-success text-white' : isActive ? 'bg-brand border-brand text-white shadow-sm shadow-brand/30' : 'bg-surface border-border text-text-faint'
                      }`}
                    >
                      {isDone ? <Check size={14} /> : i + 1}
                    </span>
                    <span className="hidden sm:block">
                      <span className={`block text-sm ${isActive ? 'text-text! font-semibold' : 'text-text-faint'}`}>{s.title}</span>
                      <span className="block text-xs text-text-faint">{s.subtitle}</span>
                    </span>
                  </button>
                  {i < EDIT_WIZARD_STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-3 rounded-full transition-colors ${i < step ? 'bg-success' : 'bg-border'}`} />}
                </div>
              )
            })}
          </div>
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
              disabled={updateProduct.isPending}
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
