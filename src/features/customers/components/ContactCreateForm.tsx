import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { isBackendUnavailable, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'
import { useCustomerOptions, useVendorOptions } from '../customerOptions'
import { useThirdPartyFormOptions } from '../thirdPartyOptions.queries'
import { useCreateContact, type ContactKind } from '../contacts.queries'
import { useCategories } from '../categories.queries'

const inputClasses = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

const CIVILITY_OPTIONS = [
  { value: 'MR', label: 'Mr.' },
  { value: 'MME', label: 'Mrs.' },
  { value: 'MLE', label: 'Miss' },
  { value: 'DR', label: 'Dr.' },
  { value: 'MTRE', label: 'Maître' },
]

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

// Real POST /api/contacts/ create (see contacts.queries.ts) against
// llx_socpeople — companyId from useCustomerOptions/useVendorOptions
// (picked by `kind`, matching how api/contacts/'s own GET branches on
// kind=customer|vendor), countryId from the real llx_c_country dictionary,
// categoryIds from the real Contact Tags/Categories collection (see
// categories.queries.ts, type=4 — Dolibarr doesn't split contact tags by
// customer/vendor, so the same collection backs both). civility/facebook/
// twitter/linkedin/whatsapp are real columns too — see that endpoint's
// header comment for which social columns it covers.
export function ContactCreateForm({ kind = 'customer' }: { kind?: ContactKind }) {
  const isVendor = kind === 'vendor'
  const { data: customerOpts, isLoading: customerOptsLoading } = useCustomerOptions(!isVendor)
  const { data: vendorOpts, isLoading: vendorOptsLoading } = useVendorOptions(isVendor)
  const customers = isVendor ? vendorOpts : customerOpts
  const customersLoading = isVendor ? vendorOptsLoading : customerOptsLoading
  const listRoute = isVendor ? ROUTES.vendorContactList : ROUTES.contactList
  const { data: formOptions } = useThirdPartyFormOptions()
  const countries = formOptions?.countries ?? []
  const { data: tagsData } = useCategories(4)
  const tags = tagsData?.items ?? []
  const createContact = useCreateContact()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'basic' | 'social'>('basic')
  const [companyId, setCompanyId] = useState('')
  const [civility, setCivility] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jobPosition, setJobPosition] = useState('')
  const [address, setAddress] = useState('')
  const [town, setTown] = useState('')
  const [zip, setZip] = useState('')
  const [email, setEmail] = useState('')
  const [phonePro, setPhonePro] = useState('')
  const [phonePerso, setPhonePerso] = useState('')
  const [phoneMobile, setPhoneMobile] = useState('')
  const [fax, setFax] = useState('')
  const [birthday, setBirthday] = useState('')
  const [countryId, setCountryId] = useState('')
  const [priv, setPriv] = useState(false)
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const [facebook, setFacebook] = useState('')
  const [twitter, setTwitter] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [formError, setFormError] = useState('')

  function toggleCategory(id: number) {
    setCategoryIds((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]))
  }

  function handleSubmit() {
    setFormError('')
    if (!lastName.trim() && !firstName.trim()) {
      setFormError('Last name / Label is required.')
      return
    }
    createContact.mutate(
      {
        companyId,
        civility,
        firstName,
        lastName,
        jobPosition,
        address,
        town,
        zip,
        email,
        phonePro,
        phonePerso,
        phoneMobile,
        fax,
        birthday,
        countryId,
        priv,
        categoryIds,
        facebook,
        twitter,
        linkedin,
        whatsapp,
      },
      {
        onSuccess: () => navigate(listRoute),
        onError: (err) => {
          if (!isBackendUnavailable(err)) setFormError('Could not save this contact — please try again.')
        },
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
            <Field label="Third-party">
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClasses}>
                <option value="">{customersLoading ? 'Loading…' : 'Select a third party'}</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Title">
              <select value={civility} onChange={(e) => setCivility(e.target.value)} className={inputClasses}>
                <option value="">Select a title</option>
                {CIVILITY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
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
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
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
              <select value={priv ? '1' : '0'} onChange={(e) => setPriv(e.target.value === '1')} className={inputClasses}>
                <option value="0">Shared</option>
                <option value="1">Private</option>
              </select>
            </Field>

            <Field label="Date of birth">
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputClasses} />
            </Field>

            <div className="sm:col-span-2 xl:col-span-3">
              <span className="text-sm text-text block mb-1.5">Tags/categories</span>
              {tags.length === 0 ? (
                <p className="text-sm text-text-faint">No contact tags yet — add one on Contact Tags/Categories first.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => {
                    const active = categoryIds.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleCategory(t.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium border ${active ? 'bg-brand text-white border-brand' : 'bg-input-bg text-text border-input-border hover:bg-surface-hover'}`}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Facebook">
              <input type="text" value={facebook} onChange={(e) => setFacebook(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Twitter / X">
              <input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="LinkedIn">
              <input type="text" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="WhatsApp">
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClasses} />
            </Field>
          </div>
        </Card>
      )}

      {createContact.isError && isBackendUnavailable(createContact.error) ? (
        <BackendUnavailableInline feature="Contacts" />
      ) : (
        formError && <p className="text-sm text-danger">{formError}</p>
      )}
    </StickyFormShell>
  )
}
