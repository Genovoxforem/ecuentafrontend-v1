import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Users2, Check, X, LoaderCircle, TriangleAlert } from 'lucide-react'
import { Card } from '../dashboard/DashboardKit'
import { api } from '../../../api/axios'
import { useLogActivity } from '../../../features/agenda/agenda.queries'
import { useAuth } from '../../../features/auth/AuthContext'

interface FieldSpec {
  key: string
  label: string
  type: 'text' | 'select' | 'file'
  options?: string[]
  defaultValue?: string
  required?: boolean
}

// Dolibarr's societe/card.php?type=c|f|p — same "New Third Party" wizard for
// customers, vendors, and prospects, just with the Prospect/Customer +
// Vendor dropdown defaults flipped, and vendors getting an extra Branch
// Code field. Prospects behave exactly like customers on the backend (no
// separate prospect flag exists in the create payload — see the mutationFn
// below); the only difference is which value this dropdown starts on.
type Variant = 'customer' | 'vendor' | 'prospect'

function buildStep1(variant: Variant): FieldSpec[] {
  const isVendor = variant === 'vendor'
  const prospectCustomerDefault = isVendor ? 'Not prospect, Not customer' : variant === 'prospect' ? 'Prospect' : 'Customer'
  const fields: FieldSpec[] = [
    // Not part of the original ported wizard — added because the live
    // backend's create endpoint rejects the request outright without a
    // name ("Customer name is required"), and Dolibarr's own equivalent
    // form always leads with this field too.
    { key: 'name', label: isVendor ? 'Vendor Name' : 'Third-Party Name', type: 'text', required: true },
    { key: 'prospectCustomer', label: 'Prospect / Customer', type: 'select', options: ['Customer', 'Prospect', 'Not prospect, Not customer'], defaultValue: prospectCustomerDefault },
    { key: 'tpin', label: 'Tpin', type: 'text', required: true },
    { key: 'trackingId', label: 'Tracking Id', type: 'text' },
    { key: 'aliasName', label: 'Alias name (commercial, trademark, ...)', type: 'text' },
    { key: 'customerGroup', label: 'Customer Group', type: 'select', options: [] },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'customerCode', label: 'Customer Code', type: 'text', defaultValue: 'CU2608-00001' },
    { key: 'email', label: 'EMail', type: 'text' },
    { key: 'vendor', label: 'Vendor', type: 'select', options: ['No', 'Yes'], defaultValue: isVendor ? 'Yes' : 'No' },
    { key: 'country', label: 'Country', type: 'select', options: ['Zambia (ZM)'], defaultValue: 'Zambia (ZM)' },
    { key: 'vendorCode', label: 'Vendor Code', type: 'text', defaultValue: 'SU2608-00001' },
  ]
  if (isVendor) {
    fields.push({ key: 'branchCode', label: 'Branch Code', type: 'text' })
  }
  fields.push(
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'currency', label: 'Currency', type: 'select', options: ['Zambian Kwacha (ZMW)'], defaultValue: 'Zambian Kwacha (ZMW)' },
    { key: 'thirdPartyType', label: 'Third-party type', type: 'select', options: [] },
  )
  return fields
}

const STEP2_FIELDS: FieldSpec[] = [
  { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Close'], defaultValue: 'Open' },
  { key: 'supervisorDetails', label: 'Supervisor Details', type: 'text' },
  { key: 'employerName', label: 'Employer Name', type: 'text' },
  { key: 'employeeNumber', label: 'Employee Number', type: 'text' },
  { key: 'thirdPartyMode', label: 'Third-party Mode', type: 'select', options: ['unprivileged', 'privileged'], defaultValue: 'unprivileged' },
  { key: 'salesRep', label: 'Assigned to sales representative', type: 'text' },
  { key: 'zipCode', label: 'Zip Code', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'stateProvince', label: 'State/Province', type: 'select', options: [] },
  { key: 'fax', label: 'Fax', type: 'text' },
  { key: 'businessEntityType', label: 'Business entity type', type: 'select', options: [] },
  { key: 'nrc', label: 'NRC', type: 'select', options: [] },
  { key: 'nrcNumber', label: 'NRC Number', type: 'text' },
  { key: 'documentUpload', label: 'Document upload', type: 'file' },
  { key: 'salesTaxUsed', label: 'Sales tax used', type: 'select', options: ['Yes', 'No'], defaultValue: 'Yes' },
  { key: 'vatId', label: 'VAT ID', type: 'text' },
  { key: 'workforce', label: 'Workforce', type: 'select', options: [] },
  { key: 'languageDefault', label: 'Language default', type: 'select', options: [] },
  { key: 'capital', label: 'Capital', type: 'text' },
  { key: 'custProspTags', label: 'Cust./Prosp. tags/categories', type: 'text' },
  { key: 'vendorTags', label: 'Vendors tags/categories', type: 'text' },
  { key: 'incoterms', label: 'Incoterms', type: 'select', options: [] },
  { key: 'environment', label: 'Environment', type: 'select', options: ['Master entity'], defaultValue: 'Master entity' },
  { key: 'barcode', label: 'Barcode', type: 'text' },
  { key: 'web', label: 'Web', type: 'text' },
]

const STEP3_FIELDS: FieldSpec[] = [
  { key: 'facebook', label: 'Facebook', type: 'text' },
  { key: 'skype', label: 'Skype', type: 'text' },
  { key: 'twitter', label: 'Twitter', type: 'text' },
  { key: 'linkedin', label: 'LinkedIn', type: 'text' },
  { key: 'instagram', label: 'Instagram', type: 'text' },
  { key: 'snapchat', label: 'Snapchat', type: 'text' },
  { key: 'googlePlus', label: 'GooglePlus', type: 'text' },
  { key: 'youtube', label: 'Youtube', type: 'text' },
  { key: 'whatsapp', label: 'Whatsapp', type: 'text' },
  { key: 'diaspora', label: 'Diaspora', type: 'text' },
  { key: 'viber', label: 'Viber', type: 'text' },
  { key: 'github', label: 'Github', type: 'text' },
]

const inputClasses = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

function Field({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-text">
        {field.label}
        {field.required && <span className="text-danger">*</span>}
      </span>
      {field.type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClasses}>
          {!value && <option value="">{field.options?.length ? `Select ${field.label.toLowerCase()}` : '—'}</option>}
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === 'file' ? (
        // No upload endpoint confirmed on the backend — stays visual-only.
        <input type="file" disabled className={`${inputClasses} file:mr-3 file:rounded file:border-0 file:bg-surface-hover file:px-2 file:py-1`} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClasses} />
      )}
    </label>
  )
}

interface CreateThirdPartyResponse {
  success: boolean
  error?: string
  message?: string
}

export function ThirdPartyCreateForm({ variant, cancelPath }: { variant: Variant; cancelPath: string }) {
  const [step, setStep] = useState(0)
  const steps = [
    { title: 'Setup basic details', fields: buildStep1(variant) },
    { title: 'Add professional info', fields: STEP2_FIELDS },
    { title: 'Add social links', fields: STEP3_FIELDS },
  ]

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of [...buildStep1(variant), ...STEP2_FIELDS, ...STEP3_FIELDS]) {
      init[f.key] = f.defaultValue ?? ''
    }
    return init
  })
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logActivity = useLogActivity()
  const { user } = useAuth()

  const setField = (key: string) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  // POST /api/customer/?action=create — read api/customer/index.php's
  // handleCreateCustomer() directly: `name` and `tpin` are both hard
  // requirements (missing tpin fails with "TPIN (Tax PIN) is required"),
  // and email/phone/address/zip/town are read and applied as-is. There is
  // no `type`/`client`/supplier param this handler reads at all — it
  // unconditionally sets client=1 (plain customer) and never touches the
  // fournisseur flag, regardless of what's sent. See the vendor-variant
  // warning banner below for what that means for this form.
  const createMutation = useMutation({
    mutationFn: async () => {
      const body = new URLSearchParams()
      body.set('name', values.name.trim())
      body.set('tpin', values.tpin.trim())
      if (values.email) body.set('email', values.email)
      if (values.phone) body.set('phone', values.phone)
      if (values.address) body.set('address', values.address)
      if (values.city) body.set('town', values.city)
      if (values.zipCode) body.set('zip', values.zipCode)
      const { data } = await api.post<CreateThirdPartyResponse>('/customer/?action=create', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!data.success) throw new Error(data.error ?? data.message ?? 'Failed to create third party')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [variant === 'vendor' ? 'vendors' : 'customers', 'summary'] })
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `New ${variant} added: ${values.name.trim()}`, category: 'other', authorName })
      navigate(cancelPath)
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'Failed to create third party'),
  })

  function handleSubmit() {
    setFormError('')
    if (!values.name.trim()) {
      setFormError(`${variant === 'vendor' ? 'Vendor' : 'Third-party'} name is required.`)
      setStep(0)
      return
    }
    if (!values.tpin.trim()) {
      setFormError('Tpin is required.')
      setStep(0)
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Users2 size={20} className="text-brand" /> New Third Party (prospect, customer, vendor)
      </h2>

      {variant === 'vendor' && (
        <Card className="!bg-warning-bg border-warning/40 flex items-start gap-3">
          <TriangleAlert size={18} className="text-warning-fg shrink-0 mt-0.5" />
          <p className="text-xs text-warning-fg">
            The backend's create endpoint has no way to flag a record as a supplier — reading its source directly confirms it always creates a plain customer record
            regardless of what's submitted here. This will save as a customer, not a vendor, in the real database.
          </p>
        </Card>
      )}

      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={s.title} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <button type="button" onClick={() => setStep(i)} title={s.title} className={`flex flex-col items-center gap-2 ${i === step ? '' : 'opacity-80'}`}>
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  i <= step ? 'bg-brand text-white' : 'bg-surface-hover text-text-muted border border-border'
                }`}
              >
                {i + 1}
              </span>
              {/* Hidden below sm: three whitespace-nowrap labels ("Setup basic
                  details", ...) don't fit a narrow viewport, and main has no
                  horizontal-scroll fallback — the step number + title
                  attribute carry it on mobile instead. */}
              <span className={`hidden sm:block text-xs whitespace-nowrap ${i === step ? 'text-text! font-medium' : 'text-text-faint'}`}>{s.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`h-px flex-1 mx-2 ${i < step ? 'bg-brand' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
          {steps[step].fields.map((field) => (
            <Field key={field.key} field={field} value={values[field.key]} onChange={setField(field.key)} />
          ))}
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="flex items-center gap-3">
        <Link to={cancelPath} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
        <button
          type="button"
          disabled={createMutation.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
          {createMutation.isPending ? 'Creating…' : 'Create third party'}
        </button>
      </div>
    </div>
  )
}
