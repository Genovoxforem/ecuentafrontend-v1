import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users2,
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
  Share2,
} from 'lucide-react'
import { Card } from '../dashboard/DashboardKit'
import { StickyFormShell } from '../layout/StickyFormShell'
import { SOCIAL_LINK_FIELDS, SocialLinksStep } from '../forms/SocialLinksStep'
import { type IconType, type FieldSpec, StepFields } from '../forms/StepFormFields'
import axios from 'axios'
import { useLogActivity } from '../../../features/agenda/agenda.queries'
import { useAuth } from '../../../features/auth/AuthContext'
import { useThirdPartyFormOptions, useStatesByCountry, fetchSocieteFormContext } from '../../../features/customers/thirdPartyOptions.queries'
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
  
  // Safe defaults if formOptions is null or properties are missing
  const countryOptions = formOptions?.countries?.map(c => c.label) ?? ['Zambia']
  const currencyOptions = formOptions?.currencies?.map(c => c.label) ?? ['Zambian Kwacha (ZMW)']
  // Real dictionary data is alphabetical (Afghanistan Afghani first) — for
  // this Zambia-focused deployment, default to the real Zambian Kwacha
  // entry when present instead of whatever's alphabetically first.
  const defaultCurrencyLabel = currencyOptions.find((label) => /zambia/i.test(label)) ?? currencyOptions[0] ?? 'Zambian Kwacha (ZMW)'
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
    { key: 'country', label: 'Country', type: 'select', options: countryOptions, defaultValue: countryOptions[0] ?? 'Zambia', icon: Globe, section: 'Location & Currency' },
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

const STEP_ICONS: IconType[] = [Contact, Briefcase, Share2]

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
          className="shrink-0 w-11 appearance-none border-r border-input-border bg-transparent pl-1 pr-1 text-sm text-text focus:outline-none"
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

// Real response shape from societe/api/societes.php?action=create,
// confirmed live: {"ok":true,"message":"Third party created","id":2071,
// "societe":{...},"redirect":"/.../societe/card.php?socid=2071"}. Errors
// use `error` in place of `ok:true` (not directly captured live, but
// matches this endpoint's list.php sibling's own {ok, error} convention).
interface CreateThirdPartyResponse {
  ok: boolean
  id?: number
  error?: string
  message?: string
}

export function ThirdPartyCreateForm({ variant, cancelPath }: { variant: Variant; cancelPath: string }) {
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
    if (!formOptions) return
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
    if (!formOptions?.countries?.length) return
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
    if (!formOptions?.currencies?.length) return
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

  // Build steps with dynamic form options — cheap pure functions, no need to
  // memoize across every field-level state update this component makes.
  const steps = [
    { title: 'Setup basic details', fields: buildStep1(variant, formOptions) },
    { title: 'Add professional info', fields: buildStep2(formOptions, stateOptions) },
    { title: 'Add social links', fields: [] as FieldSpec[] },
  ]

  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logActivity = useLogActivity()
  const { user } = useAuth()

  const setField = (key: string) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  // POST societe/api/societes.php — the REAL endpoint the legacy "New Third
  // Party" wizard itself submits to (captured live: opening
  // societe/list.php?type=c|p|f and completing the actual wizard fires this
  // exact request, not /api/customer/). Confirmed live across all three
  // variants which fields distinguish them:
  //   Customer: client=1, fournisseur=0      Prospect: client=2, fournisseur=0
  //   Vendor:   client=0, fournisseur=1, supplier_code set instead of customer_code
  // This is a mutation, so — unlike societe/api/list.php's read-only calls
  // elsewhere in this app — it enforces Dolibarr's own CSRF check, hence the
  // token fetch (see fetchSocieteToken). Response shape confirmed live:
  // {ok, message, id, societe, redirect} on success.
  const createMutation = useMutation({
    mutationFn: async () => {
      const isVendorNow = values.vendor === 'Yes'
      const client = isVendorNow ? 0 : values.prospectCustomer === 'Prospect' ? 2 : values.prospectCustomer === 'Not prospect, Not customer' ? 0 : 1
      const type = isVendorNow ? 'f' : values.prospectCustomer === 'Prospect' ? 'p' : 'c'
      const { token } = await fetchSocieteFormContext()
      const selectedNrcValue = formOptions?.nrcTypes?.find((n) => n.label === values.nrc)?.value
      const payload = {
        name_title: values.nameTitle,
        name: values.firstName.trim(),
        lastname: values.lastName.trim(),
        client,
        fournisseur: isVendorNow ? 1 : 0,
        idprof1: values.tpin.trim(),
        idprof2: values.trackingId || '',
        name_alias: values.aliasName || '',
        group_id: selectedCustomerGroupId || '',
        phone: values.phone || '',
        customer_code: values.customerCode || 'auto',
        email: values.email || '',
        // formOptions.countries' value is already the real numeric
        // llx_c_country.rowid (see thirdPartyOptions.queries.ts's
        // useCustomerLookups — sourced directly from societe/api/meta.php's
        // wizard_options, which returns that id, not an ISO code), so this
        // needs no further lookup/conversion before submitting.
        country_id: selectedCountryId || '',
        supplier_code: values.vendorCode || (isVendorNow ? 'auto' : ''),
        branch_code: values.branchCode || '',
        address: values.address || '',
        multicurrency_code: selectedCurrencyCode || '',
        typent_id: selectedThirdPartyTypeId || '',
        status: values.status === 'Closed' ? 0 : 1,
        supervisor_det: values.supervisorDetails || '',
        employer_name: values.employerName || '',
        employee_num: values.employeeNumber || '',
        // societe/api/meta.php's own usermode_options confirms the real
        // values: 1=unprivileged, 0=privileged (not 2 — the previous mapping
        // here submitted an invalid value for "privileged").
        usermode: values.thirdPartyMode === 'privileged' ? '0' : '1',
        zipcode: values.zipCode || '',
        town: values.city || '',
        state_id: selectedStateId || '',
        fax: values.fax || '',
        forme_juridique_code: selectedBusinessEntityId || '',
        nrc_id: selectedNrcValue || '',
        nrc_num: values.nrcNumber || '',
        document: {},
        assujtva_value: values.salesTaxUsed === 'No' ? 0 : 1,
        tva_intra: values.vatId || '',
        effectif_id: selectedWorkforceId || '',
        capital: values.capital || '',
        fk_incoterms: selectedIncotermId || '',
        location_incoterms: values.incotermLocation || '',
        barcode: values.barcode || '',
        url: values.web || '',
        facebook: values.facebook || '',
        skype: values.skype || '',
        twitter: values.twitter || '',
        linkedin: values.linkedin || '',
        instagram: values.instagram || '',
        snapchat: values.snapchat || '',
        googleplus: values.googlePlus || '',
        youtube: values.youtube || '',
        whatsapp: values.whatsapp || '',
        diaspora: values.diaspora || '',
        viber: values.viber || '',
        github: values.github || '',
        type,
        commercial: selectedSalesRepId ? [selectedSalesRepId] : [],
        custcats: selectedCustCategoryId ? [selectedCustCategoryId] : [],
        suppcats: selectedVendorCategoryId ? [selectedVendorCategoryId] : [],
        action: 'create',
        token,
      }
      // validateStatus lets a real 400/403 validation rejection (e.g.
      // "Please enter a valid branch code. Must be exactly 3 characters")
      // reach the `data.ok` check below instead of axios throwing its own
      // generic "Request failed with status code 400" first and discarding
      // the real reason in the response body.
      const { data } = await axios.post<CreateThirdPartyResponse>('/societe/api/societes.php', payload, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      })
      if (!data.ok) throw new Error(data.error ?? data.message ?? 'Failed to create third party')
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [variant === 'vendor' ? 'vendors' : 'customers', 'summary'] })
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `New ${variant} added: ${values.name.trim()}`, category: 'thirdparty', authorName })
      // Land on the real detail page (native rebuild of societe/card.php)
      // instead of the list — matches what the legacy wizard itself does on
      // create. Falls back to cancelPath only if the response somehow
      // didn't carry an id (shouldn't happen given data.ok was already
      // checked above, but this mutation's return type marks id optional).
      navigate(data.id ? ROUTES.customerDetail.replace(':id', String(data.id)) : cancelPath)
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'Failed to create third party'),
  })

  function handleSubmit() {
    setFormError('')
    if (!values.name.trim()) {
      setFormError('First name is required.')
      setStep(0)
      return
    }
    if (!values.tpin.trim()) {
      setFormError('Tpin is required.')
      setStep(0)
      return
    }
    if (!TPIN_PATTERN.test(values.tpin.trim())) {
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
    createMutation.mutate()
  }

  const isLastStep = step === steps.length - 1

  // Show loading state only while data is actively loading (not just when null)
  if (formOptionsLoading && !formOptions) {
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
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-10 rounded-xl bg-brand/10 text-brand shrink-0">
              <Users2 size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text!">New Third Party</h2>
              {/* <p className="text-xs text-text-faint">Add a new prospect, customer, or vendor to your records</p> */}
            </div>
          </div>

          {/* Vendor/Prospect used to show a warning banner here explaining that
              /api/customer/?action=create always saved a plain customer
              regardless of variant. That's no longer true — this form now
              submits to societe/api/societes.php, the real endpoint the
              legacy wizard itself uses, which correctly reads client/
              fournisseur (confirmed live per-variant: Customer client=1,
              Prospect client=2, Vendor client=0+fournisseur=1). No banner
              needed since the save is now correct. */}


          <div className="flex items-center">
            {steps.map((s, i) => {
              const StepIcon = STEP_ICONS[i]
              const isDone = i < step
              const isActive = i === step
              return (
                <div key={s.title} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                  <button type="button" onClick={() => setStep(i)} title={s.title} className="flex flex-col items-center gap-2 group">
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isDone
                          ? 'bg-success border-success text-white'
                          : isActive
                            ? 'bg-brand border-brand text-white shadow-sm shadow-brand/30'
                            : 'bg-surface border-border text-text-faint group-hover:border-brand/40 group-hover:text-brand'
                      }`}
                    >
                      {isDone ? <Check size={16} /> : <StepIcon size={16} />}
                    </span>
                    {/* Hidden below sm: three whitespace-nowrap labels ("Setup basic
                        details", ...) don't fit a narrow viewport, and main has no
                        horizontal-scroll fallback — the step icon + title
                        attribute carry it on mobile instead. */}
                    <span className={`hidden sm:block text-xs whitespace-nowrap ${isActive ? 'text-text! font-semibold' : 'text-text-faint'}`}>{s.title}</span>
                  </button>
                  {i < steps.length - 1 && <div className={`h-0.5 flex-1 mx-2 rounded-full transition-colors ${i < step ? 'bg-success' : 'bg-border'}`} />}
                </div>
              )
            })}
          </div>
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
              disabled={createMutation.isPending}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60 transition-colors"
            >
              {createMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
              {createMutation.isPending ? 'Creating…' : 'Create third party'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
            >
              Continue <ChevronRight size={14} />
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
        {step === 2 ? (
          <SocialLinksStep values={values} onChange={setField} />
        ) : (
          <StepFields
            fields={steps[step].fields}
            values={values}
            setValues={setValues}
            sectionIcons={SECTION_ICONS}
            columns={4}
            renderField={(field) => (field.type === 'name' ? <NameField key={field.key} values={values} setValues={setValues} required={field.required} /> : undefined)}
          />
        )}
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
