import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Wrench, ImageUp } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useGeneralSettings, useEntities } from '../settings.queries'
import { useProductFormOptions } from '../../zra/createProduct.queries'

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-sm mb-1 ${required ? 'text-danger' : 'text-text-muted'}`}>
        {label}
        {required && '*'}
        {hint && <span className="ml-1 text-[10px] font-normal text-text-faint italic">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function SectionPill({ children }: { children: React.ReactNode }) {
  return <div className="inline-block rounded-md bg-brand/10 text-brand text-sm font-semibold px-4 py-2 mb-4">{children}</div>
}

function SectionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3 items-start">{children}</div>
}

// Common currency choices — no currency-dictionary endpoint exists on this
// backend (every other form in this app that needs one hardcodes a short
// list too, e.g. ThirdPartyCreateForm's Currency field), so this is a
// static list rather than a fetched one. The real active currency (from
// /api/general/) is always included even if it isn't in this base list.
const BASE_CURRENCIES = [
  { code: 'ZMW', label: 'Zambian Kwacha (ZMW)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
]

const TABS = ['Company', 'Opening Hours', 'Accountant', 'Social Networks', 'Update Commission', 'ZRA Info'] as const
type Tab = (typeof TABS)[number]

const BUSINESS_ENTITY_TYPES = ['Sole Proprietorship', 'Partnership', 'Limited Company', 'Public Limited Company', 'NGO / Non-Profit', 'Government']

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SOCIAL_NETWORKS = ['Facebook', 'Skype', 'Twitter', 'Linkedin', 'Instagram', 'Snapchat', 'Googleplus', 'Youtube', 'Whatsapp', 'Diaspora']

function SocialIcon({ platform }: { platform: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input-border bg-surface text-xs font-bold text-text-muted">
      {platform.slice(0, 2).toUpperCase()}
    </span>
  )
}

function LogoUpload({ label }: { label: string }) {
  const [preview, setPreview] = useState<string | null>(null)
  return (
    <div>
      <label className="block text-sm mb-1 text-text-muted">{label}</label>
      <div className="w-40 h-28 rounded-md border border-dashed border-border flex items-center justify-center bg-surface overflow-hidden">
        {preview ? <img src={preview} alt={label} className="max-w-full max-h-full object-contain" /> : <span className="text-[10px] text-text-faint text-center px-2">No image available</span>}
      </div>
      <label className="mt-2 flex items-center gap-1.5 w-fit text-xs text-text-muted border border-input-border rounded px-2 py-1 cursor-pointer hover:bg-surface-hover">
        <ImageUp size={12} /> Choose File
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setPreview(URL.createObjectURL(e.target.files[0]))} />
      </label>
      <p className="text-[10px] text-text-faint mt-1">Preview only — no upload endpoint exists yet.</p>
    </div>
  )
}

export function CompanyOrganizationSetup() {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useGeneralSettings()
  const { data: formOptions } = useProductFormOptions()
  const { data: entities } = useEntities()

  const [tab, setTab] = useState<Tab>('Company')

  // Real fields — backed by GET /api/general/ (see AccountPanel's own use of
  // this same hook). Everything else on this page has no matching column on
  // that endpoint (confirmed against its real field list: app_name, tpin,
  // branch_code, country, currency, timezone, entity — nothing else), so
  // it's local-only state, same "demo only" convention as the rest of this
  // app's forms.
  const [name, setName] = useState('')
  const [countryId, setCountryId] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [tpin, setTpin] = useState('')

  useEffect(() => {
    if (!settings) return
    setName(settings.app_name || '')
    setCountryId(settings.country?.split(':')[0] ?? '')
    setCurrencyCode(settings.currency || '')
    setTpin(settings.tpin || '')
  }, [settings])

  const currencyOptions = useMemo(() => {
    if (!currencyCode || BASE_CURRENCIES.some((c) => c.code === currencyCode)) return BASE_CURRENCIES
    return [...BASE_CURRENCIES, { code: currencyCode, label: currencyCode }]
  }, [currencyCode])

  // Local-only fields (no backend column — see comment above).
  const [address, setAddress] = useState('')
  const [zip, setZip] = useState('')
  const [town, setTown] = useState('')
  const [stateProvince, setStateProvince] = useState('')
  const [phone, setPhone] = useState('')
  const [fax, setFax] = useState('')
  const [email, setEmail] = useState('')
  const [web, setWeb] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [barcode, setBarcode] = useState('')
  const [note, setNote] = useState('')
  const [managerName, setManagerName] = useState('')
  const [dpo, setDpo] = useState('')
  const [capital, setCapital] = useState('')
  const [entityType, setEntityType] = useState('')
  const [vrn, setVrn] = useState('')
  const [trackingId, setTrackingId] = useState('')
  const [profId3, setProfId3] = useState('')
  const [profId4, setProfId4] = useState('')
  const [profId5, setProfId5] = useState('')
  const [profId6, setProfId6] = useState('')
  const [invoiceBackDate, setInvoiceBackDate] = useState('1')
  const [vatId, setVatId] = useState('')
  const [companyObject, setCompanyObject] = useState('')
  const [fiscalYearStart, setFiscalYearStart] = useState('January')
  const [limitForTot, setLimitForTot] = useState('')
  const [salesTaxMode, setSalesTaxMode] = useState('standard')

  // Opening Hours tab — local-only, no scheduling backend.
  const [openingHours, setOpeningHours] = useState<Record<string, string>>(() => Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, '09.00 - 06.30'])))

  // Accountant tab — an external bookkeeper's contact details, entirely
  // separate from the company's own (above) — no backend column for any of
  // this either.
  const [accountant, setAccountant] = useState({
    name: '',
    address: '',
    zip: '',
    town: '',
    countryId: '',
    stateProvince: '',
    phone: '',
    fax: '',
    email: '',
    web: '',
    accountantCode: '',
    note: '',
    commissionPercent: '',
  })
  function setAccountantField<K extends keyof typeof accountant>(key: K, value: string) {
    setAccountant((cur) => ({ ...cur, [key]: value }))
  }

  // Social Networks tab — local-only, no social-links backend.
  const [socialNetworks, setSocialNetworks] = useState<Record<string, { url: string; id: string }>>(
    () => Object.fromEntries(SOCIAL_NETWORKS.map((p) => [p, { url: '', id: '' }])),
  )
  function setSocialField(platform: string, field: 'url' | 'id', value: string) {
    setSocialNetworks((cur) => ({ ...cur, [platform]: { ...cur[platform], [field]: value } }))
  }

  // Update Commission tab — "Entity Name" is real (GET /api/entities/, the
  // same list AccountPanel's Switch Entity picker uses); the per-entity
  // commission % itself has no backend column, so it's a local map.
  const [entityCommission, setEntityCommission] = useState<Record<number, string>>({})

  // ZRA Info tab — TPIN/Branch Code mirror the same real /api/general/
  // fields used on the Company tab (kept in sync below); everything else
  // here has no backend column.
  const [zraInfo, setZraInfo] = useState({
    taxPayerName: '',
    scdId: '',
    mcrNo: '',
    lastInvoiceNo: '',
    lastPurchaseInvoiceNo: '',
    lastSalesInvoiceNo: '',
    address: '',
    province: '',
    jurisdiction: '',
    town: '',
    mobile: '',
    email: '',
  })
  function setZraField<K extends keyof typeof zraInfo>(key: K, value: string) {
    setZraInfo((cur) => ({ ...cur, [key]: value }))
  }
  const [branchCode, setBranchCode] = useState('')
  useEffect(() => {
    if (settings) setBranchCode(settings.branch_code || '')
  }, [settings])

  const [saved, setSaved] = useState(false)

  function handleSave() {
    const countryLabel = formOptions?.countries.find((c) => c.value === countryId)?.label
    queryClient.setQueryData(['settings', 'general'], (current: typeof settings) =>
      current
        ? {
            ...current,
            app_name: name,
            currency: currencyCode,
            tpin,
            branch_code: branchCode,
            country: countryLabel ? `${countryId}::${countryLabel}` : current.country,
          }
        : current,
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wrench size={20} className="text-brand" /> Company/Organization
      </h2>

      <Card className="!h-auto !bg-info-bg border-info/30 text-info-fg text-sm">
        Edit the information of your company/organization. Click on "Save" button at the bottom of the page when done.
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Company' ? (
        <>
          <Card className="!h-auto">
            <SectionPill>Company/Organization</SectionPill>
            <SectionGrid>
              <Field label="Name" required>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} disabled={isLoading} />
              </Field>
              <Field label="Address" hint="demo only">
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Zip" hint="demo only">
                <input value={zip} onChange={(e) => setZip(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Town" hint="demo only">
                <input value={town} onChange={(e) => setTown(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Country" required>
                <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className={selectCls} disabled={isLoading}>
                  <option value="">Select…</option>
                  {(formOptions?.countries ?? []).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="State/Province" hint="demo only">
                <input value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Main currency">
                <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} className={selectCls} disabled={isLoading}>
                  {currencyOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Phone" hint="demo only">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Fax" hint="demo only">
                <input value={fax} onChange={(e) => setFax(e.target.value)} className={inputCls} />
              </Field>
              <Field label="EMail" hint="demo only">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Web" hint="demo only">
                <input value={web} onChange={(e) => setWeb(e.target.value)} className={inputCls} />
              </Field>
              <Field label="License Key" hint="demo only">
                <input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="Enter license key" className={inputCls} />
              </Field>
              <Field label="Barcode" hint="demo only">
                <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Note" hint="demo only">
                <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
              </Field>
            </SectionGrid>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-5">
              <LogoUpload label="Logo" />
              <LogoUpload label="Logo (squarred)" />
            </div>
          </Card>

          <Card className="!h-auto">
            <SectionPill>Account Details</SectionPill>
            <SectionGrid>
              <Field label="Manager(s) name (CEO, director, president...)" hint="demo only">
                <input value={managerName} onChange={(e) => setManagerName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Data Protection Officer (DPO, Data Privacy or GDPR contact)" hint="demo only">
                <input value={dpo} onChange={(e) => setDpo(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Capital" hint="demo only">
                <input value={capital} onChange={(e) => setCapital(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Business entity type" hint="demo only">
                <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={selectCls}>
                  <option value="">Select a business entity type</option>
                  {BUSINESS_ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tpin">
                <input value={tpin} onChange={(e) => setTpin(e.target.value)} className={inputCls} disabled={isLoading} />
              </Field>
              <Field label="VRN Number" hint="demo only">
                <input value={vrn} onChange={(e) => setVrn(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Tracking Id" hint="demo only">
                <input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Professional ID 3" hint="demo only">
                <input value={profId3} onChange={(e) => setProfId3(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Professional ID 4" hint="demo only">
                <input value={profId4} onChange={(e) => setProfId4(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Professional ID 5" hint="demo only">
                <input value={profId5} onChange={(e) => setProfId5(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Professional ID 6" hint="demo only">
                <input value={profId6} onChange={(e) => setProfId6(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Invoice Back Date" hint="demo only">
                <input value={invoiceBackDate} onChange={(e) => setInvoiceBackDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="VAT ID" hint="demo only">
                <input value={vatId} onChange={(e) => setVatId(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Object of the company" hint="demo only">
                <input value={companyObject} onChange={(e) => setCompanyObject(e.target.value)} className={inputCls} />
              </Field>
            </SectionGrid>
          </Card>

          <Card className="!h-auto">
            <SectionPill>Fiscal Year</SectionPill>
            <div className="max-w-xs">
              <Field label="Starting month of the fiscal year" hint="demo only">
                <select value={fiscalYearStart} onChange={(e) => setFiscalYearStart(e.target.value)} className={selectCls}>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card className="!h-auto">
            <SectionPill>Type of sales tax</SectionPill>
            <div className="max-w-xs mb-4">
              <Field label="Limit For TOT" hint="demo only">
                <input value={limitForTot} onChange={(e) => setLimitForTot(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="radio" name="sales-tax-mode" checked={salesTaxMode === 'standard'} onChange={() => setSalesTaxMode('standard')} className="mt-1 text-brand focus:ring-brand/30" />
              <span className="text-sm text-text!">Sales tax used</span>
            </label>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              By default when creating prospects, invoices, orders etc. the Sales Tax rate follows the active standard rule:
              <br />
              If the seller is not subject to Sales tax, then the Sales tax by default equals 0. End of rule.
              <br />
              If the (seller's country = buyer's country), then the Sales tax by default equals the Sales tax of the product in the seller's country. End of rule.
              <br />
              If the seller and buyer are both in the European Community and goods are transport-related products (haulage, shipping, airline), the default VAT is 0. This rule is dependant on the
              seller's country — please consult with your accountant. The VAT should be paid by the buyer to the customs office in their country and not to the seller. End of rule.
              <br />
              If the seller and buyer are both in the European Community and the buyer is not a company (with a registered intra-Community VAT number) then the VAT defaults to the VAT rate of the
              seller's country. End of rule.
              <br />
              If the seller and buyer are both in the European Community and the buyer is a company (with a registered intra-Community VAT number), then the VAT is 0 by default. End of rule.
              <br />
              In any other case the proposed default is Sales tax=0. End of rule.
            </p>
          </Card>
        </>
      ) : tab === 'Opening Hours' ? (
        <Card className="!h-auto">
          <p className="text-sm text-info-fg bg-info-bg border border-info/30 rounded-md px-3 py-2 mb-4">Enter here the regular opening hours of your company.</p>
          <SectionGrid>
            {DAYS_OF_WEEK.map((day) => (
              <Field label={day} key={day} hint="demo only">
                <input
                  value={openingHours[day]}
                  onChange={(e) => setOpeningHours((cur) => ({ ...cur, [day]: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            ))}
          </SectionGrid>
        </Card>
      ) : tab === 'Accountant' ? (
        <Card className="!h-auto">
          <p className="text-sm text-info-fg bg-info-bg border border-info/30 rounded-md px-3 py-2 mb-4">If you have an external accountant/bookkeeper, you can edit here its information.</p>
          <SectionGrid>
            <Field label="Name" hint="demo only">
              <input value={accountant.name} onChange={(e) => setAccountantField('name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Address" hint="demo only">
              <input value={accountant.address} onChange={(e) => setAccountantField('address', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Zip" hint="demo only">
              <input value={accountant.zip} onChange={(e) => setAccountantField('zip', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Town" hint="demo only">
              <input value={accountant.town} onChange={(e) => setAccountantField('town', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Country" hint="demo only">
              <select value={accountant.countryId} onChange={(e) => setAccountantField('countryId', e.target.value)} className={selectCls}>
                <option value="">Select…</option>
                {(formOptions?.countries ?? []).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="State/Province" hint="demo only">
              <input value={accountant.stateProvince} onChange={(e) => setAccountantField('stateProvince', e.target.value)} placeholder="Select a state / province" className={inputCls} />
            </Field>
            <Field label="Phone" hint="demo only">
              <input value={accountant.phone} onChange={(e) => setAccountantField('phone', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Fax" hint="demo only">
              <input value={accountant.fax} onChange={(e) => setAccountantField('fax', e.target.value)} className={inputCls} />
            </Field>
            <Field label="EMail" hint="demo only">
              <input type="email" value={accountant.email} onChange={(e) => setAccountantField('email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Web" hint="demo only">
              <input value={accountant.web} onChange={(e) => setAccountantField('web', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Accountant code" hint="demo only">
              <select value={accountant.accountantCode} onChange={(e) => setAccountantField('accountantCode', e.target.value)} className={selectCls}>
                <option value="">Select…</option>
              </select>
            </Field>
            <Field label="Note" hint="demo only">
              <input value={accountant.note} onChange={(e) => setAccountantField('note', e.target.value)} className={inputCls} />
            </Field>
          </SectionGrid>
          <div className="max-w-xs mt-3">
            <Field label="Sales Profit Commission %" hint="demo only">
              <input value={accountant.commissionPercent} onChange={(e) => setAccountantField('commissionPercent', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Card>
      ) : tab === 'Social Networks' ? (
        <Card className="!h-auto space-y-4">
          {SOCIAL_NETWORKS.map((platform) => (
            <div key={platform}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text-muted">{platform}</span>
                <span className="text-xs text-brand cursor-default">Link</span>
              </div>
              <div className="flex items-stretch gap-0 max-w-2xl">
                <SocialIcon platform={platform} />
                <input
                  value={socialNetworks[platform].url}
                  onChange={(e) => setSocialField(platform, 'url', e.target.value)}
                  placeholder="URL"
                  className={inputCls + ' rounded-l-none border-l-0'}
                />
                <input
                  value={socialNetworks[platform].id}
                  onChange={(e) => setSocialField(platform, 'id', e.target.value)}
                  placeholder="ID"
                  className={inputCls + ' max-w-[10rem] rounded-l-none border-l-0'}
                />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-text-faint italic">Demo only — no social-links endpoint exists yet.</p>
        </Card>
      ) : tab === 'Update Commission' ? (
        <Card className="!h-auto">
          <p className="text-sm text-info-fg bg-info-bg border border-info/30 rounded-md px-3 py-2 mb-4">If you have an external accountant/bookkeeper, you can edit here its information.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-text! uppercase tracking-wide border-b border-border">
                <th className="py-2 pr-4">Entity Name</th>
                <th className="py-2">Sales Profit Commission %</th>
              </tr>
            </thead>
            <tbody>
              {(entities ?? []).length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-4 text-text-faint italic">
                    No entities.
                  </td>
                </tr>
              ) : (
                (entities ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-text!">{e.label}</td>
                    <td className="py-2.5">
                      <input
                        value={entityCommission[e.id] ?? ''}
                        onChange={(ev) => setEntityCommission((cur) => ({ ...cur, [e.id]: ev.target.value }))}
                        placeholder="0.00"
                        className={inputCls + ' max-w-[10rem]'}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="!h-auto">
          <p className="text-sm text-info-fg bg-info-bg border border-info/30 rounded-md px-3 py-2 mb-4">If you have an external accountant/bookkeeper, you can edit here its information.</p>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-semibold text-text! w-64">TPIN</td>
                <td className="py-2.5 text-text!">{tpin || '—'}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-semibold text-text!">Tax Payer Name</td>
                <td className="py-2.5">
                  <input value={zraInfo.taxPayerName} onChange={(e) => setZraField('taxPayerName', e.target.value)} className={inputCls + ' max-w-md'} />
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-semibold text-text!">Scd ID</td>
                <td className="py-2.5">
                  <input value={zraInfo.scdId} onChange={(e) => setZraField('scdId', e.target.value)} className={inputCls + ' max-w-md'} />
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-semibold text-text!">Mcr No</td>
                <td className="py-2.5">
                  <input value={zraInfo.mcrNo} onChange={(e) => setZraField('mcrNo', e.target.value)} className={inputCls + ' max-w-md'} />
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-semibold text-text!">Branch Code</td>
                <td className="py-2.5">
                  <input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} className={inputCls + ' max-w-md'} disabled={isLoading} />
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-semibold text-text!">Last Invoice No</td>
                <td className="py-2.5">
                  <input value={zraInfo.lastInvoiceNo} onChange={(e) => setZraField('lastInvoiceNo', e.target.value)} className={inputCls + ' max-w-md'} />
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-semibold text-text!">Last Purchase Invoice No</td>
                <td className="py-2.5">
                  <input value={zraInfo.lastPurchaseInvoiceNo} onChange={(e) => setZraField('lastPurchaseInvoiceNo', e.target.value)} className={inputCls + ' max-w-md'} />
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-semibold text-text!">Last Sales Invoice No</td>
                <td className="py-2.5">
                  <input value={zraInfo.lastSalesInvoiceNo} onChange={(e) => setZraField('lastSalesInvoiceNo', e.target.value)} className={inputCls + ' max-w-md'} />
                </td>
              </tr>
              <tr className="border-b border-border align-top">
                <td className="py-2.5 pr-4 font-semibold text-text!">Address</td>
                <td className="py-2.5">
                  <div className="grid grid-cols-2 gap-2 max-w-md">
                    <input value={zraInfo.address} onChange={(e) => setZraField('address', e.target.value)} placeholder="Address" className={inputCls} />
                    <input value={zraInfo.province} onChange={(e) => setZraField('province', e.target.value)} placeholder="Province" className={inputCls} />
                    <input value={zraInfo.jurisdiction} onChange={(e) => setZraField('jurisdiction', e.target.value)} placeholder="Jurisdiction" className={inputCls} />
                    <input value={zraInfo.town} onChange={(e) => setZraField('town', e.target.value)} placeholder="Town" className={inputCls} />
                  </div>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 font-semibold text-text!">Mobile</td>
                <td className="py-2.5">
                  <input value={zraInfo.mobile} onChange={(e) => setZraField('mobile', e.target.value)} className={inputCls + ' max-w-md'} />
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-text!">E-Mail</td>
                <td className="py-2.5">
                  <input type="email" value={zraInfo.email} onChange={(e) => setZraField('email', e.target.value)} className={inputCls + ' max-w-md'} />
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {saved && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Saved (Name/Country/Currency/Tpin/Branch Code only — the rest isn't backed by an endpoint yet).</Card>}

      <div className="flex justify-start">
        <button type="button" onClick={handleSave} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">
          Save
        </button>
      </div>
    </div>
  )
}
