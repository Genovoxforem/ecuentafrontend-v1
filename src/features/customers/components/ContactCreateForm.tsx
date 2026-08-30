import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { useCustomerOptions, useVendorOptions } from '../customerOptions'
import { useCreateContact, type ContactKind } from '../contacts.queries'

const inputClasses = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'
const disabledClasses = 'w-full text-sm rounded-md border border-input-border bg-surface-hover text-text-faint px-3 py-2 cursor-not-allowed'

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

// Real POST societe/api/contacts.php create (see contacts.queries.ts),
// confirmed by reading that file directly — a genuine Contact::create()
// call, but scoped to one company (?socid=X) and limited to the fields
// sc_contact_apply() actually maps: lastname/firstname/email/phone/
// phone_mobile/address/zip/town/poste. Third-party is a hard requirement of
// that endpoint (it 400s without a socid), unlike the legacy page's own
// optional-looking dropdown — so it's marked required here to match what
// actually happens on submit. Every other field on the real legacy page
// (Title, Fax, Personal phone, Country, Visibility, Date of birth, Tags/
// categories, and the whole Social Media tab) has no backing API anywhere
// on this backend — kept in the layout to match the design, but disabled.
export function ContactCreateForm({ kind = 'customer' }: { kind?: ContactKind }) {
  const isVendor = kind === 'vendor'
  const { data: customerOpts, isLoading: customerOptsLoading } = useCustomerOptions(!isVendor)
  const { data: vendorOpts, isLoading: vendorOptsLoading } = useVendorOptions(isVendor)
  const companies = isVendor ? vendorOpts : customerOpts
  const companiesLoading = isVendor ? vendorOptsLoading : customerOptsLoading
  const listRoute = isVendor ? ROUTES.vendorContactList : ROUTES.contactList
  const createContact = useCreateContact()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'basic' | 'social'>('basic')
  const [companyId, setCompanyId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jobPosition, setJobPosition] = useState('')
  const [address, setAddress] = useState('')
  const [town, setTown] = useState('')
  const [zip, setZip] = useState('')
  const [email, setEmail] = useState('')
  const [phonePro, setPhonePro] = useState('')
  const [phoneMobile, setPhoneMobile] = useState('')
  const [formError, setFormError] = useState('')

  function handleSubmit() {
    setFormError('')
    if (!lastName.trim() && !firstName.trim()) {
      setFormError('Last name / Label is required.')
      return
    }
    if (!companyId) {
      setFormError('Third-party is required.')
      return
    }
    createContact.mutate(
      { companyId, firstName, lastName, jobPosition, address, town, zip, email, phonePro, phoneMobile },
      {
        onSuccess: () => navigate(listRoute),
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Could not save this contact — please try again.'),
      },
    )
  }

  return (
    <StickyFormShell
      header={
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <UserPlus size={20} className="text-brand" /> Create Contact/Address
          </h2>
          <div className="flex items-center gap-4 text-sm border-b border-border -mb-3">
            <button type="button" onClick={() => setTab('basic')} className={`pb-2 border-b-2 ${tab === 'basic' ? 'border-brand text-brand font-medium' : 'border-transparent text-text-muted'}`}>
              Basic details
            </button>
            <button type="button" onClick={() => setTab('social')} className={`pb-2 border-b-2 ${tab === 'social' ? 'border-brand text-brand font-medium' : 'border-transparent text-text-muted'}`}>
              Social Media
            </button>
          </div>
        </div>
      }
      headerClassName="py-3"
      footerLeft={
        <Link to={listRoute} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          disabled={createContact.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createContact.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Add
        </button>
      }
    >
      {tab === 'basic' ? (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Last name / Label" required>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="First name">
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Third-party" required>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClasses}>
                <option value="">{companiesLoading ? 'Loading…' : 'Select a third party'}</option>
                {companies?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Title">
              <select disabled className={disabledClasses}>
                <option>Select a title</option>
              </select>
            </Field>
            <Field label="Job position">
              <input type="text" value={jobPosition} onChange={(e) => setJobPosition(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Address">
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClasses} />
            </Field>

            <Field label="Zip Code">
              <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="City">
              <input type="text" value={town} onChange={(e) => setTown(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Country">
              <select disabled className={disabledClasses}>
                <option>Select…</option>
              </select>
            </Field>

            <Field label="Prof. phone">
              <input type="text" value={phonePro} onChange={(e) => setPhonePro(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Pers. phone">
              <input disabled className={disabledClasses} />
            </Field>
            <Field label="Mobile">
              <input type="text" value={phoneMobile} onChange={(e) => setPhoneMobile(e.target.value)} className={inputClasses} />
            </Field>

            <Field label="Fax">
              <input disabled className={disabledClasses} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Visibility">
              <select disabled className={disabledClasses}>
                <option>Shared</option>
              </select>
            </Field>

            <Field label="Date of birth">
              <input disabled className={disabledClasses} />
            </Field>

            <div className="sm:col-span-2 xl:col-span-3">
              <span className="text-sm text-text block mb-1.5">Tags/categories</span>
              <p className="text-sm text-text-faint italic">No real API available on this backend for contact tags.</p>
            </div>
          </div>
          <p className="text-xs text-text-faint italic mt-4">
            Title, Fax, Pers. phone, Country, Visibility, Date of birth and Tags/categories have no real API on this backend — shown for layout reference only.
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-text-faint italic mb-3">No real API available on this backend for contact social media fields — shown for layout reference only.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Facebook">
              <input disabled className={disabledClasses} />
            </Field>
            <Field label="Twitter / X">
              <input disabled className={disabledClasses} />
            </Field>
            <Field label="LinkedIn">
              <input disabled className={disabledClasses} />
            </Field>
            <Field label="WhatsApp">
              <input disabled className={disabledClasses} />
            </Field>
          </div>
        </Card>
      )}

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
