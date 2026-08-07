import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileEdit, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useAuth } from '../../auth/AuthContext'
import { useCreateContract } from '../contracts.queries'
import { todayIso } from '../../../shared/localCollection'

const inputClasses = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-text">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

// The reference pre-assigns the logged-in user as a removable chip on each
// rep field — shown here as a static, disabled chip (no multi-user roster
// to pick from) rather than a fake interactive multi-select.
function RepChip({ name }: { name: string }) {
  return (
    <div className={`${inputClasses} flex items-center`}>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-2 py-1 text-xs text-white">
        <X size={11} /> {name}
      </span>
    </div>
  )
}

export function ContractCreateForm() {
  const today = todayIso()
  const { user } = useAuth()
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const createContract = useCreateContract()
  const navigate = useNavigate()
  const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'

  const [thirdPartyId, setThirdPartyId] = useState('')
  const [refCustomer, setRefCustomer] = useState('')
  const [refVendor, setRefVendor] = useState('')
  const [date, setDate] = useState(today)
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  function handleSubmit() {
    setFormError('')
    const thirdParty = customers?.find((c) => c.id === thirdPartyId)
    if (!thirdParty) {
      setFormError('Third-party is required.')
      return
    }
    setPending(true)
    createContract({ thirdParty: thirdParty.name, refCustomer, refVendor, contractDate: date, author: authorName })
    setPending(false)
    navigate(ROUTES.contractList)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileEdit size={20} className="text-brand" /> Create contract
      </h2>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ref.">
            <input disabled defaultValue="Draft" className={`${inputClasses} text-text-faint`} />
          </Field>
          <Field label="Ref. customer">
            <input type="text" value={refCustomer} onChange={(e) => setRefCustomer(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Ref. vendor">
            <input type="text" value={refVendor} onChange={(e) => setRefVendor(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Third-party" required>
            <select value={thirdPartyId} onChange={(e) => setThirdPartyId(e.target.value)} className={inputClasses}>
              <option value="">{customersLoading ? 'Loading…' : 'Select a third party'}</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sales representative following-up contract" required>
            <RepChip name={authorName} />
          </Field>
          <Field label="Customer support representative" required>
            <RepChip name={authorName} />
          </Field>

          <Field label="Sales representative signing contract" required>
            <RepChip name={authorName} />
          </Field>
          <Field label="Date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Project">
            <select defaultValue="" className={inputClasses}>
              <option value="">Select a project</option>
            </select>
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
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create
        </button>
        <Link to={ROUTES.contractList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      </div>
    </div>
  )
}
