import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layers, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import {
  useCustomerGroup,
  useCreateCustomerGroup,
  useUpdateCustomerGroup,
  DISCOUNT_METHOD_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
} from '../customerGroups.queries'
import { isBackendUnavailable } from '../../../shared/components/BackendUnavailable'

// Field set and default selections (Discount Method=Percentage, Discount
// Type=Increase) match societe/new_card.php's own selectarray() defaults.
// The Discount Percentage/Discount Type fields only show for
// discountMethod=1 (Percentage) — for discountMethod=2 (Product Price) the
// legacy page instead loads a per-product pricing table (llx_group_price_product),
// which is out of scope here since it isn't part of the requested screen.
export function CustomerGroupCreateForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useCustomerGroup(id)
  const createGroup = useCreateCustomerGroup()
  const updateGroup = useUpdateCustomerGroup()
  const navigate = useNavigate()

  const [label, setLabel] = useState('')
  const [discountMethod, setDiscountMethod] = useState(1)
  const [discountValue, setDiscountValue] = useState('0')
  const [discountType, setDiscountType] = useState(1)
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!existing) return
    setLabel(existing.label)
    setDiscountMethod(existing.discountMethod ?? 1)
    setDiscountValue(String(existing.discount))
    setDiscountType(existing.discountType)
    setDescription(existing.description ?? '')
  }, [existing])

  useEffect(() => {
    if (isEdit && !existing) navigate(ROUTES.customerGroupList)
  }, [isEdit, existing, navigate])

  const pending = createGroup.isPending || updateGroup.isPending

  function handleSubmit() {
    setFormError('')
    if (!label.trim()) {
      setFormError('Label is required.')
      return
    }
    const input = {
      label: label.trim(),
      discountMethod,
      discount: discountMethod === 1 ? Number(discountValue) || 0 : 0,
      discountType: discountMethod === 1 ? discountType : 0,
      description: description.trim(),
    }
    if (isEdit && id) {
      updateGroup.mutate(
        { id: Number(id), input },
        {
          onSuccess: () => navigate(ROUTES.customerGroupList),
          onError: (err) => setFormError(isBackendUnavailable(err) ? 'Customer groups aren’t available on this backend yet — changes can’t be saved.' : 'Failed to save changes.'),
        },
      )
    } else {
      createGroup.mutate(input, {
        onSuccess: () => navigate(ROUTES.customerGroupList),
        onError: (err) => setFormError(isBackendUnavailable(err) ? 'Customer groups aren’t available on this backend yet — this can’t be created.' : 'Failed to create customer group.'),
      })
    }
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Layers size={20} className="text-brand" /> {isEdit ? 'Edit Customer Group' : 'Create Customer Group'}
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.customerGroupList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} {isEdit ? 'Save changes' : 'Create Customer Group'}
        </button>
      }
    >
      <Card className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ref" required>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClasses} placeholder="e.g. Wholesale, VIP, Staff" />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClasses} min-h-[42px]`} rows={1} />
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          )}
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
