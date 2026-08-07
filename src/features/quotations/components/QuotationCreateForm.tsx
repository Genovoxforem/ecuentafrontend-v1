import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileBadge, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useAuth } from '../../auth/AuthContext'
import { useCreateQuotation } from '../quotations.queries'
import { todayIso } from '../../../shared/localCollection'

export function QuotationCreateForm() {
  const today = todayIso()
  const { user } = useAuth()
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const createQuotation = useCreateQuotation()
  const navigate = useNavigate()

  const [customerId, setCustomerId] = useState('')
  const [refCustomer, setRefCustomer] = useState('')
  const [validityDays, setValidityDays] = useState(15)
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState(0)
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  function addDays(iso: string, days: number) {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  function handleSubmit() {
    setFormError('')
    const customer = customers?.find((c) => c.id === customerId)
    if (!customer) {
      setFormError('Customer is required.')
      return
    }
    setPending(true)
    createQuotation({
      thirdParty: customer.name,
      refCustomer,
      date,
      endDate: addDays(date, validityDays),
      amountExclTax: amount,
      author: user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown',
    })
    setPending(false)
    navigate(ROUTES.quotationList)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileBadge size={20} className="text-brand" /> New Quotation
      </h2>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ref.">
            <input disabled defaultValue="Draft" className={`${inputClasses} text-text-faint`} />
          </Field>
          <Field label="Ref. customer">
            <input type="text" value={refCustomer} onChange={(e) => setRefCustomer(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Customer" required>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClasses}>
              <option value="">{customersLoading ? 'Loading…' : 'Select a customer'}</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Validity duration" required>
            <input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className={inputClasses} />
          </Field>

          <Field label="Date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Estimated amount (excl. tax)">
            <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputClasses} />
          </Field>

          <Field label="Payment Terms">
            <Select options={[]} />
          </Field>
          <Field label="Payment Type">
            <Select options={[]} />
          </Field>

          <Field label="Bank account">
            <Select options={[]} />
          </Field>
          <Field label="Source">
            <Select options={[]} />
          </Field>

          <Field label="Availability delay (after order)">
            <Select options={[]} />
          </Field>
          <Field label="Shipping method">
            <Select options={[]} />
          </Field>

          <Field label="Project">
            <Select options={[]} />
          </Field>
          <Field label="Default doc template">
            <Select defaultValue="azur" options={['azur']} />
          </Field>

          <Field label="Currency">
            <Select defaultValue="Zambian Kwacha (ZMW)" options={['Zambian Kwacha (ZMW)']} />
          </Field>
          <Field label="Incoterms">
            <Select options={[]} />
          </Field>

          <Field label="Note (public)">
            <input type="text" className={inputClasses} />
          </Field>
          <Field label="Note (private)">
            <input type="text" className={inputClasses} />
          </Field>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create draft
        </button>
        <Link to={ROUTES.quotationList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      </div>
    </div>
  )
}
