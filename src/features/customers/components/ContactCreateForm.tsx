import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { useCustomerOptions, useVendorOptions } from '../customerOptions'
import { useCreateContact, useContactMeta, type ContactKind } from '../contacts.queries'
import { useCustomerLookups } from '../thirdPartyOptions.queries'

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

// POST contact/fapi/create.php (see contacts.queries.ts) — Contact::create()
// with lastname/firstname/poste/address/zip/town/country_id/email, the
// professional, personal and mobile phones, fax and visibility (priv).
// Third-party is required (this is the customers' contact list). Title (civility), Date of birth and the
// Social Media handles are accepted by the same endpoint, their options coming from contact/fapi/meta.php.
// Tags/categories stay a note: meta.php lists no contact tag on this backend.
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
  const [phonePerso, setPhonePerso] = useState('')
  const [fax, setFax] = useState('')
  const [countryId, setCountryId] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [formError, setFormError] = useState('')
  const [civility, setCivility] = useState('')
  const [birthday, setBirthday] = useState('')
  const [socialNetworks, setSocialNetworks] = useState<Record<string, string>>({})
  const { data: lookups, isLoading: lookupsLoading } = useCustomerLookups()
  const { data: meta, isLoading: metaLoading } = useContactMeta()

  function handleSubmit() {
    setFormError('')
    if (!lastName.trim()) {
      setFormError('Last name / Label is required.')
      return
    }
    if (!companyId) {
      setFormError('Third-party is required.')
      return
    }
    createContact.mutate(
      { companyId, firstName, lastName, jobPosition, address, town, zip, email, phonePro, phoneMobile, phonePerso, fax, countryId, isPrivate, civility, birthday, socialNetworks },
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
              <select value={civility} onChange={(e) => setCivility(e.target.value)} className={inputClasses}>
                <option value="">{metaLoading ? 'Loading…' : 'Select a title'}</option>
                {meta?.civilities.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
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
              <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className={inputClasses}>
                <option value="">{lookupsLoading ? 'Loading…' : 'Select…'}</option>
                {lookups?.countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prof. phone">
              <input type="text" value={phonePro} onChange={(e) => setPhonePro(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Pers. phone">
              <input type="text" value={phonePerso} onChange={(e) => setPhonePerso(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Mobile">
              <input type="text" value={phoneMobile} onChange={(e) => setPhoneMobile(e.target.value)} className={inputClasses} />
            </Field>

            <Field label="Fax">
              <input type="text" value={fax} onChange={(e) => setFax(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Visibility">
              <select value={isPrivate ? 'private' : 'shared'} onChange={(e) => setIsPrivate(e.target.value === 'private')} className={inputClasses}>
                <option value="shared">Shared</option>
                <option value="private">Private</option>
              </select>
            </Field>

            <Field label="Date of birth">
              <input type="date" value={birthday} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthday(e.target.value)} className={inputClasses} />
            </Field>

            <div className="sm:col-span-2 xl:col-span-3">
              <span className="text-sm text-text block mb-1.5">Tags/categories</span>
              <p className="text-sm text-text-faint italic">No real API available on this backend for contact tags.</p>
            </div>
          </div>
          
        </Card>
      ) : (
        <Card>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {metaLoading && <p className="text-sm text-text-faint">Loading…</p>}
            {meta?.social_networks.map((n) => (
              <Field key={n.code} label={n.label}>
                <input type="text" value={socialNetworks[n.code] ?? ''} onChange={(e) => setSocialNetworks((cur) => ({ ...cur, [n.code]: e.target.value }))} className={inputClasses} />
              </Field>
            ))}
          </div>
        </Card>
      )}

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
