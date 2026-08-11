import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layers, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useCustomerGroup, useCreateCustomerGroup, useUpdateCustomerGroup, type DiscountMethod, type DiscountType } from '../customerGroups.queries'

export function CustomerGroupCreateForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useCustomerGroup(id)
  const createGroup = useCreateCustomerGroup()
  const updateGroup = useUpdateCustomerGroup()
  const navigate = useNavigate()

  const [label, setLabel] = useState('')
  const [discountMethod, setDiscountMethod] = useState<DiscountMethod>('Product Price')
  const [discountValue, setDiscountValue] = useState('0')
  const [discountType, setDiscountType] = useState<DiscountType>('N/A')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  // Prefill once the local collection resolves the row being edited —
  // it's already in react-query's cache by the time this mounts (no
  // network round trip), but the effect keeps this resilient to render
  // order rather than assuming that.
  useEffect(() => {
    if (!existing) return
    setLabel(existing.label)
    setDiscountMethod(existing.discountMethod)
    setDiscountValue(String(existing.discountValue))
    setDiscountType(existing.discountType)
    setDescription(existing.description)
  }, [existing])

  useEffect(() => {
    if (isEdit && !existing) navigate(ROUTES.customerGroupList)
  }, [isEdit, existing, navigate])

  function handleSubmit() {
    setFormError('')
    if (!label.trim()) {
      setFormError('Label is required.')
      return
    }
    setPending(true)
    const input = {
      label: label.trim(),
      discountMethod,
      discountValue: discountMethod === 'Percentage' ? Number(discountValue) || 0 : 0,
      discountType: discountMethod === 'Percentage' ? discountType : ('N/A' as DiscountType),
      description: description.trim(),
    }
    if (isEdit && id) {
      updateGroup(id, input)
    } else {
      createGroup(input)
    }
    setPending(false)
    navigate(ROUTES.customerGroupList)
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Layers size={20} className="text-brand" /> {isEdit ? 'Edit Customer Group' : 'New Customer Group'}
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
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} {isEdit ? 'Save changes' : 'Create group'}
        </button>
      }
    >
      <Card className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Label" required>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClasses} placeholder="e.g. Wholesale, VIP, Staff" />
          </Field>
          <Field label="Discount Method">
            <select value={discountMethod} onChange={(e) => setDiscountMethod(e.target.value as DiscountMethod)} className={inputClasses}>
              <option value="Product Price">Product Price</option>
              <option value="Percentage">Percentage</option>
            </select>
          </Field>

          {discountMethod === 'Percentage' && (
            <>
              <Field label="Discount Value (%)">
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className={inputClasses}
                  min={0}
                  max={100}
                />
              </Field>
              <Field label="Discount Type">
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className={inputClasses}>
                  <option value="Increase">Increase</option>
                  <option value="Decrease">Decrease</option>
                </select>
              </Field>
            </>
          )}

          <div className="sm:col-span-2">
            <Field label="Description">
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} />
            </Field>
          </div>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
