import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  X,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  Contact,
  Phone,
  Mail,
  Tag,
  Tags,
  Hash,
  Globe,
  Link2,
  MapPin,
  Coins,
  Layers,
  IdCard,
  Truck,
  User,
  UserCheck,
  Users,
  Building2,
  CircleDot,
  UserCog,
  UserRound,
  BadgeCheck,
  Shield,
  Map as MapIcon,
  Printer,
  Briefcase,
  FileText,
  FileUp,
  Percent,
  Receipt,
  Landmark,
  Ship,
  ScanLine,
  Paperclip,
} from 'lucide-react'
import { Card } from '../dashboard/DashboardKit'
import { StickyFormShell, WizardStepper } from '../layout/StickyFormShell'
import { SOCIAL_LINK_FIELDS, SocialLinksStep } from '../forms/SocialLinksStep'
import { type IconType, type FieldSpec, StepFields } from '../forms/StepFormFields'
import axios from 'axios'
import { createThirdParty, updateThirdParty } from '../../../api/customers'
import type { CustomerProfile, ThirdPartyExtra } from '../../../features/customers/customerDetail.queries'
import { useThirdPartyFormOptions, useStatesByCountry } from '../../../features/customers/thirdPartyOptions.queries'
import { ROUTES } from '../../../routes'

const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Miss']

// No TPIN format is documented or enforced anywhere in this codebase or its
// backend (only presence is checked server-side — see the mutationFn
// comment below) — this is Zambia's published ZRA TPIN format (10 digits),
// applied here as a client-side format hint, not a verified backend rule.
const TPIN_PATTERN = /^\d{10}$/

// Dolibarr's societe/card.php?type=c|f|p — same "New Third Party" wizard for
// customers, vendors, and prospects, just with the Prospect/Customer +
// Vendor dropdown defaults flipped, and vendors getting an extra Branch
// Code field. Prospects behave exactly like customers on the backend (no
// separate prospect flag exists in the create payload — see the mutationFn
// below); the only difference is which value this dropdown starts on.
type Variant = 'customer' | 'vendor' | 'prospect'

// Icon shown next to each subsection heading — grouping is presentational
// only, fields still submit the same as one flat set.
const SECTION_ICONS: Record<string, IconType> = {
  Identity: Contact,
  'Contact Info': Phone,
  Classification: Tags,
  'Location & Currency': MapPin,
  'Status & Assignment': Briefcase,
  'Address Details': MapPin,
  'Business & Tax': Landmark,
  'Tags & Documents': Paperclip,
}

function buildStep1(variant: Variant, formOptions: ReturnType<typeof useThirdPartyFormOptions>['data'] | null): FieldSpec[] {
  const isVendor = variant === 'vendor'
  const prospectCustomerDefault = isVendor ? 'Not prospect, Not customer' : variant === 'prospect' ? 'Prospect' : 'Customer'
  
  // Options come entirely from the backend's form-options endpoint — no
  // static fallbacks. If the backend hasn't loaded yet, the selects will be
  // empty, which is the honest state rather than showing fake data.
  const countryOptions = formOptions?.countries?.map(c => c.label) ?? []
  const currencyOptions = formOptions?.currencies?.map(c => c.label) ?? []
  const defaultCurrencyLabel = currencyOptions.find((label) => /zambia/i.test(label)) ?? currencyOptions[0] ?? ''
  const customerGroupOptions = formOptions?.customerGroups?.map(g => g.label) ?? []
  const thirdPartyTypeOptions = formOptions?.thirdPartyTypes?.map(t => t.label) ?? []
  
  const fields: FieldSpec[] = [
    // Matches the reference Dolibarr wizard's compound Title/First/Last name
    // row (see NameField below) — the combined value still submits as the
    // single `name` the live backend's create endpoint requires.
    { key: 'name', label: 'First Name', type: 'name', required: true, section: 'Identity' },
    {
      key: 'prospectCustomer',
      label: 'Prospect / Customer',
      type: 'select',
      options: ['Customer', 'Prospect', 'Not prospect, Not customer'],
      defaultValue: prospectCustomerDefault,
      icon: UserCheck,
      section: 'Identity',
    },
    {
      key: 'tpin',
      label: 'Tpin',
      type: 'text',
      required: true,
      icon: IdCard,
      section: 'Identity',
      digitsOnly: true,
      maxLength: 10,
      validate: (v) => (TPIN_PATTERN.test(v) ? null : 'Must be exactly 10 digits'),
    },
    // Labeled "ID Prof 2" on the real legacy wizard — this is Dolibarr's
    // idprof2 field (confirmed by this form's own create payload, which
    // already sends it as idprof2), not a distinct "tracking" concept.
    { key: 'trackingId', label: 'ID Prof 2', type: 'text', icon: Hash, section: 'Identity' },
    { key: 'aliasName', label: 'Alias name (commercial, trademark, ...)', type: 'text', icon: Tag, section: 'Identity' },
    { key: 'customerGroup', label: 'Customer Group', type: 'select', options: customerGroupOptions, icon: Users, placeholder: 'Select a group', section: 'Identity' },
    { key: 'phone', label: 'Phone', type: 'text', icon: Phone, section: 'Contact Info' },
    { key: 'customerCode', label: 'Customer code', type: 'text', defaultValue: formOptions?.nextCustomerCode ?? '', icon: Hash, section: 'Contact Info' },
    { key: 'email', label: 'Email', type: 'text', icon: Mail, section: 'Contact Info' },
    { key: 'vendor', label: 'Vendor', type: 'select', options: ['No', 'Yes'], defaultValue: isVendor ? 'Yes' : 'No', icon: Truck, section: 'Classification' },
    // Labeled "Supplier code" on the real legacy wizard — Dolibarr's own
    // French-derived terminology for a vendor ("fournisseur"); same
    // supplier_code payload field either way.
    { key: 'vendorCode', label: 'Supplier code', type: 'text', defaultValue: formOptions?.nextVendorCode ?? '', icon: Hash, section: 'Classification' },
  ]
  if (isVendor) {
    // The real backend rejects a non-empty branch_code that isn't exactly 3
    // characters (societe/api/societes.php's sc_societes_validate_create,
    // read directly) — validating this client-side surfaces that rule
    // immediately instead of only after a failed submission.
    fields.push({
      key: 'branchCode',
      label: 'Branch Code',
      type: 'text',
      icon: Building2,
      section: 'Classification',
      validate: (v) => (v === '' || v.length === 3 ? null : 'Must be exactly 3 characters'),
    })
  }
  fields.push(
    { key: 'country', label: 'Country', type: 'select', options: countryOptions, defaultValue: countryOptions[0] ?? '', icon: Globe, section: 'Location & Currency' },
    { key: 'address', label: 'Address', type: 'text', icon: MapPin, section: 'Location & Currency' },
    { key: 'currency', label: 'Currency', type: 'select', options: currencyOptions, defaultValue: defaultCurrencyLabel, icon: Coins, section: 'Location & Currency' },
    { key: 'thirdPartyType', label: 'Third-party type', type: 'select', options: thirdPartyTypeOptions, icon: Layers, section: 'Location & Currency' },
  )
  return fields
}

function buildStep2(formOptions: ReturnType<typeof useThirdPartyFormOptions>['data'] | null, stateOptions: string[]): FieldSpec[] {
  // Safe defaults if formOptions is null or properties are missing
  const businessEntityOptions = formOptions?.businessEntityTypes?.map(b => b.label) ?? []
  const nrcOptions = formOptions?.nrcTypes?.map(n => n.label) ?? []
  const workforceOptions = formOptions?.workforce?.map(w => w.label) ?? []
  const incotermOptions = formOptions?.incoterms?.map(i => i.label) ?? []
  const salesRepOptions = formOptions?.salesReps?.map(r => r.label) ?? []
  const custCategoryOptions = formOptions?.custCategories?.map(c => c.label) ?? []
  const vendorCategoryOptions = formOptions?.vendorCategories?.map(c => c.label) ?? []

  return [
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Closed'], defaultValue: 'Open', icon: CircleDot, section: 'Status & Assignment' },
    { key: 'supervisorDetails', label: 'Supervisor Details', type: 'text', icon: UserCog, section: 'Status & Assignment' },
    { key: 'employerName', label: 'Employer Name', type: 'text', icon: Building2, section: 'Status & Assignment' },
    { key: 'employeeNumber', label: 'Employee Number', type: 'text', icon: BadgeCheck, section: 'Status & Assignment' },
    { key: 'thirdPartyMode', label: 'Third-party Mode', type: 'select', options: ['unprivileged', 'privileged'], defaultValue: 'unprivileged', icon: Shield, section: 'Status & Assignment' },
    // Labeled "Allocate commercial" on the real legacy wizard (confirmed
    // live: <select name="commercial">) — same field, same payload key
    // (commercial) as this app's read-only "Sales Reps" row on the Customer
    // detail tab (societe/api/customer.php's sales_reps), not a separate
    // concept from "sales representative".
    { key: 'salesRep', label: 'Allocate commercial', type: 'select', options: salesRepOptions, icon: UserRound, section: 'Status & Assignment' },

    { key: 'zipCode', label: 'Zip Code', type: 'text', icon: MapPin, section: 'Address Details' },
    // Labeled "Town" on the real legacy wizard — Dolibarr's own town field
    // (same `town` payload key this form already sends).
    { key: 'city', label: 'Town', type: 'text', icon: MapPin, section: 'Address Details' },
    { key: 'stateProvince', label: 'State', type: 'select', options: stateOptions, icon: MapIcon, section: 'Address Details' },
    { key: 'fax', label: 'Fax', type: 'text', icon: Printer, section: 'Address Details' },

    // Labeled "Juridical status" on the real legacy wizard — Dolibarr's
    // forme_juridique_code field (same payload key this form already
    // sends), not a separate "business entity type" concept.
    { key: 'businessEntityType', label: 'Juridical status', type: 'select', options: businessEntityOptions, icon: Briefcase, section: 'Business & Tax' },
    { key: 'nrc', label: 'NRC', type: 'select', options: nrcOptions, icon: FileText, section: 'Business & Tax' },
    { key: 'nrcNumber', label: 'NRC Number', type: 'text', icon: Hash, section: 'Business & Tax' },
    { key: 'documentUpload', label: 'Document upload', type: 'file', icon: FileUp, section: 'Business & Tax' },
    // Labeled "VAT is used" on the real legacy wizard — same
    // assujtva_value payload field this form already sends.
    { key: 'salesTaxUsed', label: 'VAT is used', type: 'select', options: ['Yes', 'No'], defaultValue: 'Yes', icon: Percent, section: 'Business & Tax' },
    // Labeled "VAT Intra" on the real legacy wizard — this is Dolibarr's
    // tva_intra field (EU-style VAT/intracommunity number), confirmed by
    // this form's own create payload already sending it as tva_intra.
    { key: 'vatId', label: 'VAT Intra', type: 'text', icon: Receipt, section: 'Business & Tax' },
    { key: 'workforce', label: 'Workforce', type: 'select', options: workforceOptions, icon: Users, section: 'Business & Tax' },
    { key: 'capital', label: 'Capital', type: 'text', icon: Landmark, section: 'Business & Tax' },

    // Labeled "Customers/Prospects categories" and "Suppliers categories"
    // on the real legacy wizard — same custcats/suppcats payload fields
    // this form already sends.
    { key: 'custProspTags', label: 'Customers/Prospects categories', type: 'select', options: custCategoryOptions, icon: Tags, section: 'Categories & Links' },
    { key: 'vendorTags', label: 'Suppliers categories', type: 'select', options: vendorCategoryOptions, icon: Tags, section: 'Categories & Links' },
    { key: 'incoterms', label: 'Incoterm', type: 'select', options: incotermOptions, icon: Ship, section: 'Categories & Links' },
    { key: 'incotermLocation', label: 'Incoterm location', type: 'text', icon: MapPin, section: 'Categories & Links' },
    { key: 'barcode', label: 'Barcode', type: 'text', icon: ScanLine, section: 'Categories & Links' },
    { key: 'web', label: 'Web', type: 'text', icon: Link2, section: 'Categories & Links' },
  ]
}

function ReviewStep({ fields, values }: { fields: FieldSpec[]; values: Record<string, string> }) {
  const filled = fields.filter((fl) => (values[fl.key] ?? '').toString().trim() !== '' && fl.type !== 'file')
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-text!">Review details</h3>
      {filled.length === 0 ? (
        <p className="text-sm text-text-faint">Nothing entered yet.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
          {filled.map((fl) => (
            <div key={fl.key} className="min-w-0">
              <dt className="text-xs text-text-faint">{fl.label}</dt>
              <dd className="truncate text-sm text-text!">{values[fl.key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}


const STEP_SECTIONS: string[][] = [
  ['Identity', 'Contact Info', 'Classification'],
  ['Location & Currency', 'Address Details'],
  ['Business & Tax', 'Status & Assignment'],
  ['Categories & Links', 'Tags & Documents'],
  [],
]

// Matches the reference wizard's compound Title + First Name + Last Name
// row — the two name parts are joined into `values.name` on every keystroke
// so the rest of the form (validation, submission) keeps reading a single
// combined name field, same as before this was split out.
function NameField({
  values,
  setValues,
  required,
}: {
  values: Record<string, string>
  setValues: Dispatch<SetStateAction<Record<string, string>>>
  required?: boolean
}) {
  const updateNamePart = (part: 'firstName' | 'lastName') => (value: string) =>
    setValues((prev) => {
      const next = { ...prev, [part]: value }
      next.name = `${next.firstName} ${next.lastName}`.trim()
      return next
    })
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">
        First Name
        {required && <span className="text-danger ml-0.5">*</span>}
      </span>
      <div className="flex items-stretch w-full rounded-lg border border-input-border bg-input-bg overflow-hidden transition-shadow focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand">
        <span className="flex items-center pl-2.5 pr-1 text-text-faint">
          <User size={15} />
        </span>
        <select
          value={values.nameTitle}
          onChange={(e) => setValues((prev) => ({ ...prev, nameTitle: e.target.value }))}
          className="shrink-0 w-14 appearance-none border-r border-input-border bg-transparent pl-1 pr-1 text-sm text-text focus:outline-none"
        >
          {TITLE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={values.firstName}
          onChange={(e) => updateNamePart('firstName')(e.target.value)}
          placeholder="First Name"
          className="min-w-0 flex-1 border-r border-input-border bg-transparent px-2 py-1.5 text-sm text-text placeholder:text-text-faint focus:outline-none"
        />
        <input
          type="text"
          value={values.lastName}
          onChange={(e) => updateNamePart('lastName')(e.target.value)}
          placeholder="Last Name"
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-text placeholder:text-text-faint focus:outline-none"
        />
      </div>
    </label>
  )
}

// Response shape from societe/api/societes.php?action=create:
// {"ok":true,"message":"Third party created","id":2071,
// "societe":{...},"redirect":"/.../societe/card.php?socid=2071"}. Errors
// use `error` in place of `ok:true` (not verified; matches this endpoint's
// list.php sibling's own {ok, error} convention).
interface CreateThirdPartyResponse {
  ok: boolean
  id?: number
  error?: string
  message?: string
}

// `profile` turns the wizard into the Edit page: the same steps, prefilled from the saved third party, and only the
// fields the user changed are sent to societe/fapi/update.php (so a field this form cannot show never gets blanked).
export function ThirdPartyCreateForm({ variant, cancelPath, profile, extra }: { variant: Variant; cancelPath: string; profile?: CustomerProfile; extra?: ThirdPartyExtra }) {
  // Fetch form options
  const { data: formOptions, isLoading: formOptionsLoading } = useThirdPartyFormOptions()

  const [step, setStep] = useState(0)

  const [values, setValues] = useState<Record<string, string>>(() => {
    // firstName/lastName/nameTitle back the compound NameField below; `name`
    // itself is kept in sync as their combined value on every keystroke.
    const init: Record<string, string> = { firstName: '', lastName: '', nameTitle: 'Mr' }
    // Initialize with buildStep1/buildStep2 with null formOptions to get base fields
    for (const f of [...buildStep1(variant, null), ...buildStep2(null, [])]) {
      init[f.key] = f.defaultValue ?? ''
    }
    for (const f of SOCIAL_LINK_FIELDS) {
      init[f.key] = ''
    }
    return init
  })

  // Customer Code / Vendor Code start out blank (formOptions is still
  // loading when `values` above is first initialized) — fill in the real
  // live-preview code once it arrives, same as legacy's own next-code
  // preview, but only if the user hasn't already typed something over it.
  useEffect(() => {
    // Editing a saved record: its own codes are shown, never a freshly previewed next code.
    if (!formOptions || profile) return
    setValues((prev) => ({
      ...prev,
      customerCode: prev.customerCode || formOptions.nextCustomerCode,
      vendorCode: prev.vendorCode || formOptions.nextVendorCode,
    }))
  }, [formOptions?.nextCustomerCode, formOptions?.nextVendorCode])

  // Country starts out as the bare fallback string 'Zambia' (same reason as
  // above — real formOptions isn't loaded yet when `values` is initialized),
  // which never matches any real "<Name> (<CODE>)" country label once the
  // real list arrives. Left alone, the <select> just falls back to visually
  // showing its first option while `values.country` stays stuck on the
  // unmatched fallback string underneath — which breaks selectedCountryId
  // below (State/Province would never load) and would silently submit the
  // wrong country if the user never happens to touch this field.
  //
  // Once real data loads, snap it to the installation's actual configured
  // home country (formOptions.defaultCountryId, sourced from the real
  // MAIN_INFO_SOCIETE_COUNTRY constant) — matching societe/card.php's own
  // default (`$mysoc->country_id`) exactly, rather than just picking
  // whichever country happens to sort first alphabetically. Falls back to
  // the first country in the list only if that constant is somehow unset.
  // Never overwrites an actual user selection.
  useEffect(() => {
    if (!formOptions?.countries?.length || profile) return
    const isRealCountry = formOptions.countries.some((c) => c.label === values.country)
    if (isRealCountry) return
    const home = formOptions.countries.find((c) => c.value === String(formOptions.defaultCountryId))
    setValues((prev) => ({ ...prev, country: (home ?? formOptions.countries[0]).label }))
  }, [formOptions?.countries, formOptions?.defaultCountryId])

  // Same stale-fallback problem as Country above: `values.currency` starts
  // out as the bare fallback string 'Zambian Kwacha (ZMW)' (buildStep1's
  // own fallback, used before formOptions loads), which doesn't exactly
  // match any real option once the live dict.php currency list arrives
  // (its real label is just 'Zambian Kwacha', no code suffix) — left alone
  // the <select> silently falls back to its first (alphabetical) option,
  // "Afghanistan Afghani". Snap to the real Zambian Kwacha entry once real
  // data loads, same "never overwrite an actual user selection" guard.
  useEffect(() => {
    if (!formOptions?.currencies?.length || profile) return
    const isRealCurrency = formOptions.currencies.some((c) => c.label === values.currency)
    if (isRealCurrency) return
    const zmw = formOptions.currencies.find((c) => /zambia/i.test(c.label))
    setValues((prev) => ({ ...prev, currency: (zmw ?? formOptions.currencies[0]).label }))
  }, [formOptions?.currencies])

  // State/Province is reactive to the selected Country — legacy's own field
  // (select_state($country_code), societe/card.php) works the same way — so
  // it's fetched separately from the rest of useThirdPartyFormOptions rather
  // than baked into that combined bundle.
  const selectedCountryId = formOptions?.countries?.find((c) => c.label === values.country)?.value
  const { data: stateOptionsData } = useStatesByCountry(selectedCountryId)
  const stateOptions = stateOptionsData?.map((s) => s.label) ?? []
  const selectedStateId = stateOptionsData?.find((s) => s.label === values.stateProvince)?.value
  const selectedCurrencyCode = formOptions?.currencies?.find((c) => c.label === values.currency)?.value
  const selectedThirdPartyTypeId = formOptions?.thirdPartyTypes?.find((t) => t.label === values.thirdPartyType)?.value
  const selectedWorkforceId = formOptions?.workforce?.find((w) => w.label === values.workforce)?.value
  const selectedCustomerGroupId = formOptions?.customerGroups?.find((g) => g.label === values.customerGroup)?.value
  const selectedBusinessEntityId = formOptions?.businessEntityTypes?.find((b) => b.label === values.businessEntityType)?.value
  const selectedIncotermId = formOptions?.incoterms?.find((i) => i.label === values.incoterms)?.value
  const selectedSalesRepId = formOptions?.salesReps?.find((r) => r.label === values.salesRep)?.value
  const selectedCustCategoryId = formOptions?.custCategories?.find((c) => c.label === values.custProspTags)?.value
  const selectedVendorCategoryId = formOptions?.vendorCategories?.find((c) => c.label === values.vendorTags)?.value

  // ── Edit mode: prefill once the dropdown options are in, remember what was loaded so only changes are saved ──
  const [prefilled, setPrefilled] = useState(!profile)
  // `extra` arrives with the profile (the edit module waits for both), so one prefill covers everything.
  const initialRef = useRef<Record<string, string>>({})
  const stateDone = useRef(false)
  useEffect(() => {
    if (!profile || prefilled || !formOptions) return
    const labelOf = (list: { value: string; label: string }[] | undefined, id: string | number | null | undefined) =>
      id === null || id === undefined || id === '' || id === 0 || id === '0' ? '' : (list?.find((o) => String(o.value) === String(id))?.label ?? '')
    const loaded: Record<string, string> = {
      nameTitle: TITLE_OPTIONS.includes(profile.nameTitle) ? profile.nameTitle : 'Mr',
      firstName: profile.name,
      lastName: profile.lastname,
      name: `${profile.name} ${profile.lastname}`.trim(),
      prospectCustomer: profile.client === 2 ? 'Prospect' : profile.isCustomer ? 'Customer' : 'Not prospect, Not customer',
      vendor: profile.isVendor ? 'Yes' : 'No',
      tpin: profile.tpin,
      trackingId: profile.trackingId,
      aliasName: profile.nameAlias,
      customerGroup: labelOf(formOptions.customerGroups, profile.groupId),
      phone: profile.phone,
      customerCode: profile.codeClient,
      vendorCode: profile.codeFournisseur,
      email: profile.email,
      branchCode: profile.branchCode,
      country: labelOf(formOptions.countries, profile.countryId),
      address: profile.address,
      currency: labelOf(formOptions.currencies, profile.currencyCode),
      thirdPartyType: labelOf(formOptions.thirdPartyTypes, profile.typentId),
      status: profile.status === 0 ? 'Closed' : 'Open',
      supervisorDetails: profile.supervisorDetails,
      employerName: profile.employerName,
      employeeNumber: profile.employeeNum,
      zipCode: profile.zip,
      city: profile.town,
      fax: profile.fax,
      businessEntityType: labelOf(formOptions.businessEntityTypes, profile.formeJuridiqueCode),
      nrc: labelOf(formOptions.nrcTypes, profile.nrcId),
      nrcNumber: profile.nrcNum,
      vatId: profile.vatId,
      workforce: labelOf(formOptions.workforce, profile.effectifId),
      capital: profile.capital,
      barcode: profile.barcode,
      web: profile.web,
    }
    // The rest comes from societe/fapi/get.php's `extended` block: sales rep, tags, incoterm, VAT, mode, social links.
    if (extra) {
      const e = extra.extended
      loaded.salesRep = labelOf(formOptions.salesReps, e.sales_reps?.[0])
      loaded.custProspTags = labelOf(formOptions.custCategories, e.custcats?.[0])
      loaded.vendorTags = labelOf(formOptions.vendorCategories, e.suppcats?.[0])
      loaded.incoterms = labelOf(formOptions.incoterms, e.incoterm_id)
      loaded.incotermLocation = e.location_incoterms ?? ''
      loaded.salesTaxUsed = e.assujtva_value === 0 ? 'No' : 'Yes'
      loaded.thirdPartyMode = e.usermode === 0 ? 'privileged' : 'unprivileged'
      for (const sf of SOCIAL_LINK_FIELDS) loaded[sf.key] = e.social_networks?.[sf.key.toLowerCase()] ?? ''
    }
    setValues((prev) => {
      const merged = { ...prev, ...Object.fromEntries(Object.entries(loaded).filter(([k, v]) => v !== '' || prev[k] === undefined)) }
      // A saved value with no matching option (or an empty one) must not keep a create-time default.
      for (const [k, v] of Object.entries(loaded)) if (v === '') merged[k] = ''
      initialRef.current = { ...merged }
      return merged
    })
    setPrefilled(true)
  }, [profile, extra, prefilled, formOptions])
  // State/Province options depend on the country, so it is matched once they arrive.
  useEffect(() => {
    if (!profile || !prefilled || stateDone.current || !stateOptionsData) return
    stateDone.current = true
    const label = stateOptionsData.find((o) => String(o.value) === String(profile.stateId))?.label ?? ''
    initialRef.current = { ...initialRef.current, stateProvince: label }
    setValues((prev) => ({ ...prev, stateProvince: label }))
  }, [profile, prefilled, stateOptionsData])

  // Build steps with dynamic form options — cheap pure functions, no need to
  // memoize across every field-level state update this component makes.
  const allFields = [...buildStep1(variant, formOptions), ...buildStep2(formOptions, stateOptions)]
  const assigned = new Set(STEP_SECTIONS.flat())
  const stepFields = (i: number) => allFields.filter((fl) => (fl.section ? STEP_SECTIONS[i].includes(fl.section) : i === 0 && !assigned.has(fl.section ?? '')))
  const steps = [
    { title: 'Personal Details', subtitle: 'Basic information', fields: stepFields(0) },
    { title: 'Address Details', subtitle: 'Location information', fields: stepFields(1) },
    { title: 'Business & Tax', subtitle: 'Legal and tax details', fields: stepFields(2) },
    { title: 'Categories & Links', subtitle: 'Additional information', fields: stepFields(3) },
    { title: 'Review & Save', subtitle: 'Confirm and submit', fields: [] as FieldSpec[] },
  ]

  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const setField = (key: string) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  // POST societe/fapi/create.php (key-authenticated, no CSRF token): customer = client 1, prospect = client 2, vendor = fournisseur 1.
  const createMutation = useMutation({
    mutationFn: async (): Promise<CreateThirdPartyResponse> => {
      const isVendorNow = values.vendor === 'Yes'
      const selectedNrcValue = formOptions?.nrcTypes?.find((n) => n.label === values.nrc)?.value

      // societe/fapi/create.php takes the main fields and, since 16 Oct 2026, the 29 extended ones the wizard collects
      // (last name, group, sales rep, tags, legal form, workforce, incoterms, state, barcode, social links ...). Empty
      // values are left out; the response lists anything the class could not apply under `notes`.
      try {
        const social = Object.fromEntries(SOCIAL_LINK_FIELDS.map((sf) => [sf.key.toLowerCase(), values[sf.key]?.trim() ?? '']).filter(([, v]) => v))
        const num = (v: string | undefined) => (v ? Number(v) : undefined)
        const created = await createThirdParty({
          name: values.firstName.trim() || values.name.trim(),
          type: isVendorNow ? 'vendor' : values.prospectCustomer === 'Prospect' ? 'prospect' : 'customer',
          name_alias: values.aliasName || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
          fax: values.fax || undefined,
          url: values.web || undefined,
          address: values.address || undefined,
          zip: values.zipCode || undefined,
          town: values.city || undefined,
          country_id: selectedCountryId ? Number(selectedCountryId) : undefined,
          tpin: values.tpin.trim(),
          tracking: values.trackingId || undefined,
          vat_number: values.vatId || undefined,
          currency: selectedCurrencyCode || undefined,
          status: values.status === 'Closed' ? 0 : 1,
          lastname: values.lastName.trim() || undefined,
          name_title: values.nameTitle || undefined,
          group_id: num(selectedCustomerGroupId),
          typent_id: num(selectedThirdPartyTypeId),
          effectif_id: num(selectedWorkforceId),
          forme_juridique_code: num(selectedBusinessEntityId),
          state_id: num(selectedStateId),
          incoterm_id: num(selectedIncotermId),
          location_incoterms: values.incotermLocation || undefined,
          capital: num(values.capital),
          branch_code: values.branchCode || undefined,
          barcode: values.barcode || undefined,
          nrc_id: selectedNrcValue || undefined,
          nrc_num: values.nrcNumber || undefined,
          supervisor_det: values.supervisorDetails || undefined,
          employer_name: values.employerName || undefined,
          employee_num: values.employeeNumber || undefined,
          usermode: values.thirdPartyMode === 'privileged' ? 0 : 1,
          assujtva_value: values.salesTaxUsed === 'No' ? 0 : 1,
          commercial: selectedSalesRepId ? [Number(selectedSalesRepId)] : undefined,
          custcats: selectedCustCategoryId ? [Number(selectedCustCategoryId)] : undefined,
          suppcats: selectedVendorCategoryId ? [Number(selectedVendorCategoryId)] : undefined,
          ...social,
        })
        return { ok: true, id: created.id }
      } catch (err) {
        if (axios.isAxiosError(err) && typeof err.response?.data?.message === 'string') throw new Error(err.response.data.message)
        throw err
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [variant === 'vendor' ? 'vendors' : 'customers', 'summary'] })
      // Land on the real detail page (native rebuild of societe/card.php)
      // instead of the list — matches what the legacy wizard itself does on
      // create. Falls back to cancelPath only if the response somehow
      // didn't carry an id (shouldn't happen given data.ok was already
      // checked above, but this mutation's return type marks id optional).
      navigate(data.id ? ROUTES.customerDetail.replace(':id', String(data.id)) : cancelPath)
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'Failed to create third party'),
  })

  // POST societe/fapi/update.php?id= with only the fields that differ from what was loaded.
  const updateMutation = useMutation({
    mutationFn: async (): Promise<number> => {
      const initial = initialRef.current
      const changed = (k: string) => (values[k] ?? '') !== (initial[k] ?? '')
      const body: Record<string, string | number | number[]> = {}
      const text: [string, string][] = [
        ['aliasName', 'name_alias'],
        ['email', 'email'],
        ['phone', 'phone'],
        ['fax', 'fax'],
        ['web', 'url'],
        ['address', 'address'],
        ['zipCode', 'zip'],
        ['city', 'town'],
        ['tpin', 'tpin'],
        ['trackingId', 'tracking'],
        ['vatId', 'vat_number'],
        ['lastName', 'lastname'],
        ['nameTitle', 'name_title'],
        ['branchCode', 'branch_code'],
        ['barcode', 'barcode'],
        ['nrcNumber', 'nrc_num'],
        ['supervisorDetails', 'supervisor_det'],
        ['employerName', 'employer_name'],
        ['employeeNumber', 'employee_num'],
        ['incotermLocation', 'location_incoterms'],
        ['customerCode', 'code_client'],
        ['vendorCode', 'code_fournisseur'],
        ['capital', 'capital'],
        ...SOCIAL_LINK_FIELDS.map((sf): [string, string] => [sf.key, sf.key.toLowerCase()]),
      ]
      for (const [formKey, apiKey] of text) if (changed(formKey)) body[apiKey] = (values[formKey] ?? '').trim()
      if (changed('firstName')) body.name = values.firstName.trim()
      if (changed('status')) body.status = values.status === 'Closed' ? 0 : 1
      if (changed('prospectCustomer') || changed('vendor')) {
        body.type = values.vendor === 'Yes' ? 'vendor' : values.prospectCustomer === 'Prospect' ? 'prospect' : values.prospectCustomer === 'Not prospect, Not customer' ? 'all' : 'customer'
        // A new vendor needs a supplier code; 'auto' asks the backend to number it.
        if (body.type === 'vendor' && !values.vendorCode.trim() && !changed('vendorCode')) body.code_fournisseur = 'auto'
      }
      if (changed('thirdPartyMode')) body.usermode = values.thirdPartyMode === 'privileged' ? 0 : 1
      if (changed('salesTaxUsed')) body.assujtva_value = values.salesTaxUsed === 'No' ? 0 : 1
      const ids: [string, string | undefined, string][] = [
        ['country', selectedCountryId, 'country_id'],
        ['currency', selectedCurrencyCode, 'currency'],
        ['customerGroup', selectedCustomerGroupId, 'group_id'],
        ['thirdPartyType', selectedThirdPartyTypeId, 'typent_id'],
        ['workforce', selectedWorkforceId, 'effectif_id'],
        ['businessEntityType', selectedBusinessEntityId, 'forme_juridique_code'],
        ['stateProvince', selectedStateId, 'state_id'],
        ['incoterms', selectedIncotermId, 'incoterm_id'],
        ['nrc', formOptions?.nrcTypes?.find((n) => n.label === values.nrc)?.value, 'nrc_id'],
      ]
      for (const [formKey, id, apiKey] of ids) if (changed(formKey) && id) body[apiKey] = apiKey === 'currency' || apiKey === 'nrc_id' ? id : Number(id)
      if (changed('salesRep') && selectedSalesRepId) body.commercial = [Number(selectedSalesRepId)]
      if (changed('custProspTags') && selectedCustCategoryId) body.custcats = [Number(selectedCustCategoryId)]
      if (changed('vendorTags') && selectedVendorCategoryId) body.suppcats = [Number(selectedVendorCategoryId)]
      if (Object.keys(body).length > 0) {
        try {
          await updateThirdParty({ id: profile!.id, ...body })
        } catch (err) {
          if (axios.isAxiosError(err) && typeof err.response?.data?.message === 'string') throw new Error(err.response.data.message)
          throw err
        }
      }
      return profile!.id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate(ROUTES.customerDetail.replace(':id', String(id)))
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'Failed to save the third party'),
  })
  const submitting = createMutation.isPending || updateMutation.isPending

  function handleSubmit() {
    setFormError('')
    if (!values.name.trim()) {
      setFormError('First name is required.')
      setStep(0)
      return
    }
    // An older record may have no TPIN: only insist on it when creating or when it is being changed.
    if (!values.tpin.trim() && (!profile || values.tpin !== (initialRef.current.tpin ?? ''))) {
      setFormError('Tpin is required.')
      setStep(0)
      return
    }
    if (values.tpin.trim() && !TPIN_PATTERN.test(values.tpin.trim())) {
      setFormError('Tpin must be exactly 10 digits.')
      setStep(0)
      return
    }
    // Matches the reference wizard: Third-party type only turns mandatory
    // (red label) once Prospect/Customer is set to "Prospect" — confirmed
    // by comparing societe/card.php?type=c vs type=p directly. The `> 0`
    // guard is defensive, not currently load-bearing: thirdPartyTypes now
    // comes from the real admin/dict.php?id=8 scrape (13 real options), so
    // this requirement is satisfiable again. Left in place in case that
    // source ever goes down the way /customers/lookups/ already has —
    // requiring a value nothing can satisfy would permanently block every
    // Prospect submission with no way forward, same failure mode this line
    // was originally added to fix.
    if (values.prospectCustomer === 'Prospect' && !values.thirdPartyType && (formOptions?.thirdPartyTypes?.length ?? 0) > 0) {
      setFormError('Third-party type is required for prospects.')
      setStep(0)
      return
    }
    if (profile) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isLastStep = step === steps.length - 1

  // Show loading state only while data is actively loading (not just when null)
  if ((formOptionsLoading && !formOptions) || !prefilled) {
    return (
      <StickyFormShell
        header={
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-10 rounded-xl bg-brand/10 text-brand shrink-0">
              <LoaderCircle size={22} className="animate-spin" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text!">Loading form...</h2>
            </div>
          </div>
        }
        footerLeft={null}
        footerRight={null}
      >
        <Card className="!h-auto flex-1 flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-3">
            <LoaderCircle size={32} className="animate-spin text-brand" />
            <p className="text-text-muted">Loading dropdown options...</p>
          </div>
        </Card>
      </StickyFormShell>
    )
  }

  return (
    <StickyFormShell
      headerClassName="pt-1.5 pb-2.5"
      header={
        <>
          <WizardStepper steps={steps} step={step} onStep={setStep} />
        </>
      }
      footerLeft={
        <Link to={cancelPath} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-hover transition-colors">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-hover transition-colors"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {isLastStep ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60 transition-colors"
            >
              {submitting ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
              {submitting ? (profile ? 'Saving…' : 'Creating…') : profile ? 'Save changes' : 'Create third party'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
            >
              Next: {steps[step + 1].title} <ChevronRight size={14} />
            </button>
          )}
        </>
      }
    >
      {/* !h-auto overrides Card's default h-full — inside this flex-1 wrapper (a flex
          item with a real computed height), h-full would actually apply and clip this
          card to that height, letting its field grid visually overflow past the box
          without affecting the scroll height, which is what let the sticky footer below
          stick early and cover the last couple of rows.

          !pb-20: !h-auto alone isn't enough once a step has this many rows (step 2 grew
          past what fits) — the sticky footer overlays rather than pushes content, so
          without extra bottom clearance equal to roughly its own height, the footer still
          visually covers the Business & Tax section's last row and the Tags & Documents
          section header sitting right above it. */}
      <Card className="!h-auto flex-1 min-h-0 !pb-20">
        {step === 4 ? (
          <ReviewStep fields={allFields} values={values} />
        ) : (
          <>
          <StepFields
            fields={steps[step].fields}
            values={values}
            setValues={setValues}
            sectionIcons={SECTION_ICONS}
            columns={4}
            renderField={(field) => (field.type === 'name' ? <NameField key={field.key} values={values} setValues={setValues} required={field.required} /> : undefined)}
          />
          {step === 3 && <SocialLinksStep values={values} onChange={setField} />}
          </>
        )}
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
