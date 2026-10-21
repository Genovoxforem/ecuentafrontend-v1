import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layers, Check, X, LoaderCircle, Search } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import {
  checkGroupLabel,
  useCustomerGroupDetail,
  useCreateCustomerGroup,
  useGroupProducts,
  useUpdateCustomerGroup,
  DISCOUNT_METHOD_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
  PRODUCTS_PAGE_SIZE,
} from '../customerGroups.queries'

// Discount Method=Percentage shows Discount Percentage + Discount Type;
// Discount Method=Product Price shows the per-product price grid instead (only products
// with a price typed in get a group price; the rest keep their normal selling price).
export function CustomerGroupCreateForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { data: existing, isError: loadFailed, error: loadError } = useCustomerGroupDetail(id)
  const createGroup = useCreateCustomerGroup()
  const updateGroup = useUpdateCustomerGroup()
  const navigate = useNavigate()

  const [label, setLabel] = useState('')
  const [discountMethod, setDiscountMethod] = useState(1)
  const [discountValue, setDiscountValue] = useState('0')
  const [discountType, setDiscountType] = useState(1)
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [labelNote, setLabelNote] = useState<{
    ok: boolean
    text: string
  } | null>(null)

  // Product Price grid: typed values by product id (strings so a half-typed number is kept as typed).
  const [prices, setPrices] = useState<Record<number, string>>({})
  const [productSearch, setProductSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [pageSize, setPageSize] = useState(PRODUCTS_PAGE_SIZE)

  useEffect(() => {
    if (!existing) return
    setLabel(existing.label)
    setDiscountMethod(existing.discountMethod || 1)
    setDiscountValue(String(existing.discount))
    setDiscountType(existing.discountType)
    setDescription(existing.description)
    setPrices(Object.fromEntries(existing.prices.map((p) => [p.productId, String(p.price)])))
  }, [existing])

  const products = useGroupProducts(discountMethod === 2 ? id : undefined, appliedSearch, offset, pageSize)
  const pending = createGroup.isPending || updateGroup.isPending

  async function verifyLabel() {
    const value = label.trim()
    if (!value) {
      setLabelNote(null)
      return true
    }
    try {
      const res = await checkGroupLabel(value, id)
      setLabelNote({
        ok: res.available,
        text: res.message || (res.available ? 'Label is available' : 'Group label already exists'),
      })
      return res.available
    } catch {
      setLabelNote(null)
      return true
    }
  }

  async function handleSubmit() {
    setFormError('')
    if (!label.trim()) {
      setFormError('Label is required.')
      return
    }
    const percent = Number(discountValue) || 0
    if (discountMethod === 1 && (percent < 0 || percent > 100)) {
      setFormError('A percentage discount must be between 0 and 100.')
      return
    }
    if (!(await verifyLabel())) {
      setFormError('Group label already exists.')
      return
    }
    const input = {
      label: label.trim(),
      discountMethod,
      discount: discountMethod === 1 ? percent : 0,
      discountType: discountMethod === 1 ? discountType : 0,
      description: description.trim(),
      prices: Object.entries(prices)
        .filter(([, v]) => v.trim() !== '' && Number.isFinite(Number(v)))
        .map(([productId, v]) => ({
          productId: Number(productId),
          price: Number(v),
        })),
    }
    if (isEdit && id) {
      updateGroup.mutate(
        { id: Number(id), input },
        {
          onSuccess: () => navigate(ROUTES.customerGroupList),
          onError: (e) => setFormError(e.message),
        },
      )
    } else {
      createGroup.mutate(input, {
        onSuccess: () => navigate(ROUTES.customerGroupList),
        onError: (e) => setFormError(e.message),
      })
    }
  }

  return (
    <StickyFormShell
      scrollsInternally={discountMethod === 2}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Layers size={20} className="text-brand" /> {isEdit ? 'Edit Customer Group' : 'Create Customer Group'}
        </h2>
      }
      // The Product Price grid's pager is the shell's footer bar, so it stays pinned to the bottom of the page.
      footerBar={
        discountMethod === 2 ? (
          <ListPagination
            page={Math.floor(offset / pageSize) + 1}
            perPage={pageSize}
            total={offset + (products.data?.rows.length ?? 0) + (products.data?.hasMore ? 1 : 0)}
            shown={products.data?.rows.length ?? 0}
            onPageChange={(page) => setOffset((page - 1) * pageSize)}
            onPerPageChange={(n) => {
              setPageSize(n)
              setOffset(0)
            }}
          />
        ) : undefined
      }
    >
      <InBanner>
        <Link to={ROUTES.customerGroupList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
        <button
          type="button"
          disabled={pending || (isEdit && !existing)}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} {isEdit ? 'Save changes' : 'Create Customer Group'}
        </button>
      </InBanner>

      {isEdit && loadFailed && <p className="text-sm text-danger">{loadError instanceof Error ? loadError.message : 'Customer group not found.'}</p>}

      <Card className="!h-auto">
        {/* One line on a wide screen: Ref, Description, Discount Method (+ Discount Percentage and Type for Percentage). */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 ${discountMethod === 1 ? 'xl:grid-cols-5' : ''}`}>
          <Field label="Ref" required>
            <input
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value)
                setLabelNote(null)
              }}
              onBlur={verifyLabel}
              className={inputClasses}
              placeholder="e.g. Wholesale, VIP, Staff"
            />
            {labelNote && <p className={`mt-1 text-xs ${labelNote.ok ? 'text-success-fg' : 'text-danger'}`}>{labelNote.text}</p>}
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClasses} !h-auto !min-h-0 resize-none overflow-hidden`} rows={1} />
          </Field>

          <Field label="Discount Method">
            <select value={discountMethod} onChange={(e) => setDiscountMethod(Number(e.target.value))} className={inputClasses}>
              {DISCOUNT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          {discountMethod === 1 && (
            <>
              <Field label="Discount Percentage">
                <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className={inputClasses} min={0} max={100} />
              </Field>
              <Field label="Discount Type">
                <select value={discountType} onChange={(e) => setDiscountType(Number(e.target.value))} className={inputClasses}>
                  {DISCOUNT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
        {isEdit && existing && existing.customersAssigned > 0 && (
          <p className="mt-3 text-xs text-text-faint">
            {existing.customersAssigned} customer
            {existing.customersAssigned === 1 ? '' : 's'} currently use this group.
          </p>
        )}
      </Card>

      {discountMethod === 2 && (
        <>
          <Card className="!h-auto !p-0 overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h3 className="font-semibold text-text!">Product Price</h3>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setOffset(0)
                  setAppliedSearch(productSearch.trim())
                }}
              >
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search product…" className={`${inputClasses} !pl-8`} />
                </div>
                <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover">
                  Search
                </button>
              </form>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-surface-alt">
                  <tr className="text-left text-xs text-text-muted">
                    <th className="px-4 py-2">Ref</th>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2 text-right">Tax %</th>
                    <th className="px-4 py-2 text-right">Selling price</th>
                    <th className="px-4 py-2 text-right">Group price</th>
                  </tr>
                </thead>
                <tbody>
                  {products.isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-text-faint">
                        Loading products…
                      </td>
                    </tr>
                  )}
                  {products.isError && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-danger">
                        {products.error instanceof Error ? products.error.message : 'Could not load the products.'}
                      </td>
                    </tr>
                  )}
                  {(products.data?.rows ?? []).map((p) => (
                    <tr key={p.productId} className="border-t border-border">
                      <td className="px-4 py-1.5 text-text-muted">{p.ref}</td>
                      <td className="px-4 py-1.5">{p.label}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{p.taxRate}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{p.sellPrice.toFixed(2)}</td>
                      <td className="px-4 py-1.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={prices[p.productId] ?? (p.groupPrice === null ? '' : String(p.groupPrice))}
                          onChange={(e) =>
                            setPrices((prev) => ({
                              ...prev,
                              [p.productId]: e.target.value,
                            }))
                          }
                          placeholder="—"
                          className={`${inputClasses} !w-28 text-right`}
                        />
                      </td>
                    </tr>
                  ))}
                  {!products.isLoading && !products.isError && (products.data?.rows.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-text-faint">
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
