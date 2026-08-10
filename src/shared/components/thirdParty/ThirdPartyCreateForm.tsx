import { useEffect, useRef, useState, type ComponentType, type Dispatch, type SetStateAction } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users2,
  Check,
  X,
  LoaderCircle,
  TriangleAlert,
  ChevronDown,
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
  Languages,
  Landmark,
  Ship,
  Server,
  ScanLine,
  Paperclip,
  Share2,
  Camera,
  Ghost,
  Play,
  Code2,
  MessageCircle,
  Search,
} from 'lucide-react'
import { Card, ICON_STYLES } from '../dashboard/DashboardKit'
import { StickyFormShell } from '../layout/StickyFormShell'
import { api } from '../../../api/axios'
import { useLogActivity } from '../../../features/agenda/agenda.queries'
import { useAuth } from '../../../features/auth/AuthContext'

type IconType = ComponentType<{ size?: number; className?: string }>

interface FieldSpec {
  key: string
  label: string
  type: 'text' | 'select' | 'file' | 'name'
  options?: string[]
  defaultValue?: string
  required?: boolean
  icon?: IconType
  section?: string
  // Overrides the auto-generated "Select {label}" empty-option text — the
  // reference Dolibarr wizard (societe/card.php) reads "Select a group" for
  // Customer Group specifically, not "Select customer group".
  placeholder?: string
  // Renders a filterable combobox instead of a native <select> — the
  // reference wizard's Prospect/Customer, Country, and Currency pickers are
  // all searchable, unlike its plain dropdowns (Vendor, Status, ...).
  searchable?: boolean
  // Live format check, run against the trimmed value; returns an error
  // string or null. Only shown once the field is non-empty, so it never
  // nags an untouched field.
  validate?: (value: string) => string | null
  // Restricts keystrokes to digits only (e.g. Tpin) — stripped on every
  // change rather than merely flagged after the fact by `validate`.
  digitsOnly?: boolean
  maxLength?: number
}

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

function buildStep1(variant: Variant): FieldSpec[] {
  const isVendor = variant === 'vendor'
  const prospectCustomerDefault = isVendor ? 'Not prospect, Not customer' : variant === 'prospect' ? 'Prospect' : 'Customer'
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
    { key: 'trackingId', label: 'Tracking Id', type: 'text', icon: Hash, section: 'Identity' },
    { key: 'aliasName', label: 'Alias name (commercial, trademark, ...)', type: 'text', icon: Tag, section: 'Identity' },
    { key: 'customerGroup', label: 'Customer Group', type: 'select', options: [], icon: Users, placeholder: 'Select a group', section: 'Identity' },
    { key: 'phone', label: 'Phone', type: 'text', icon: Phone, section: 'Contact Info' },
    { key: 'email', label: 'EMail', type: 'text', icon: Mail, section: 'Contact Info' },
    { key: 'customerCode', label: 'Customer Code', type: 'text', defaultValue: 'CU2608-00001', icon: Hash, section: 'Classification' },
    { key: 'vendor', label: 'Vendor', type: 'select', options: ['No', 'Yes'], defaultValue: isVendor ? 'Yes' : 'No', icon: Truck, section: 'Classification' },
    { key: 'vendorCode', label: 'Vendor Code', type: 'text', defaultValue: 'SU2608-00001', icon: Hash, section: 'Classification' },
  ]
  if (isVendor) {
    fields.push({ key: 'branchCode', label: 'Branch Code', type: 'text', icon: Building2, section: 'Classification' })
  }
  fields.push(
    { key: 'country', label: 'Country', type: 'select', options: ['Zambia (ZM)'], defaultValue: 'Zambia (ZM)', icon: Globe, section: 'Location & Currency' },
    { key: 'address', label: 'Address', type: 'text', icon: MapPin, section: 'Location & Currency' },
    { key: 'currency', label: 'Currency', type: 'select', options: ['Zambian Kwacha (ZMW)'], defaultValue: 'Zambian Kwacha (ZMW)', icon: Coins, section: 'Location & Currency' },
    { key: 'thirdPartyType', label: 'Third-party type', type: 'select', options: [], icon: Layers, section: 'Location & Currency' },
  )
  return fields
}

const STEP2_FIELDS: FieldSpec[] = [
  { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Close'], defaultValue: 'Open', icon: CircleDot, section: 'Status & Assignment' },
  { key: 'thirdPartyMode', label: 'Third-party Mode', type: 'select', options: ['unprivileged', 'privileged'], defaultValue: 'unprivileged', icon: Shield, section: 'Status & Assignment' },
  { key: 'supervisorDetails', label: 'Supervisor Details', type: 'text', icon: UserCog, section: 'Status & Assignment' },
  { key: 'salesRep', label: 'Assigned to sales representative', type: 'text', icon: UserRound, section: 'Status & Assignment' },
  { key: 'employerName', label: 'Employer Name', type: 'text', icon: Building2, section: 'Status & Assignment' },
  { key: 'employeeNumber', label: 'Employee Number', type: 'text', icon: BadgeCheck, section: 'Status & Assignment' },

  { key: 'zipCode', label: 'Zip Code', type: 'text', icon: MapPin, section: 'Address Details' },
  { key: 'city', label: 'City', type: 'text', icon: MapPin, section: 'Address Details' },
  { key: 'stateProvince', label: 'State/Province', type: 'select', options: [], icon: MapIcon, section: 'Address Details' },
  { key: 'fax', label: 'Fax', type: 'text', icon: Printer, section: 'Address Details' },

  { key: 'businessEntityType', label: 'Business entity type', type: 'select', options: [], icon: Briefcase, section: 'Business & Tax' },
  { key: 'nrc', label: 'NRC', type: 'select', options: [], icon: FileText, section: 'Business & Tax' },
  { key: 'nrcNumber', label: 'NRC Number', type: 'text', icon: Hash, section: 'Business & Tax' },
  { key: 'salesTaxUsed', label: 'Sales tax used', type: 'select', options: ['Yes', 'No'], defaultValue: 'Yes', icon: Percent, section: 'Business & Tax' },
  { key: 'vatId', label: 'VAT ID', type: 'text', icon: Receipt, section: 'Business & Tax' },
  { key: 'capital', label: 'Capital', type: 'text', icon: Landmark, section: 'Business & Tax' },
  { key: 'workforce', label: 'Workforce', type: 'select', options: [], icon: Users, section: 'Business & Tax' },
  { key: 'languageDefault', label: 'Language default', type: 'select', options: [], icon: Languages, section: 'Business & Tax' },
  { key: 'incoterms', label: 'Incoterms', type: 'select', options: [], icon: Ship, section: 'Business & Tax' },
  { key: 'environment', label: 'Environment', type: 'select', options: ['Master entity'], defaultValue: 'Master entity', icon: Server, section: 'Business & Tax' },
  { key: 'barcode', label: 'Barcode', type: 'text', icon: ScanLine, section: 'Business & Tax' },
  { key: 'web', label: 'Web', type: 'text', icon: Link2, section: 'Business & Tax' },

  { key: 'custProspTags', label: 'Cust./Prosp. tags/categories', type: 'text', icon: Tags, section: 'Tags & Documents' },
  { key: 'vendorTags', label: 'Vendors tags/categories', type: 'text', icon: Tags, section: 'Tags & Documents' },
  { key: 'documentUpload', label: 'Document upload', type: 'file', icon: FileUp, section: 'Tags & Documents' },
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

// lucide-react ships no brand/logo icons (removed project-wide for
// trademark reasons), so social platforms get a colored letter/glyph badge
// instead — closest available stand-in for brand recognition.
const SOCIAL_META: Record<string, { badge?: string; icon?: IconType; className: string }> = {
  facebook: { badge: 'f', className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  linkedin: { badge: 'in', className: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
  twitter: { badge: 'X', className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
  skype: { icon: Phone, className: ICON_STYLES.cyan },
  instagram: { icon: Camera, className: ICON_STYLES.rose },
  snapchat: { icon: Ghost, className: ICON_STYLES.amber },
  googlePlus: { badge: 'G+', className: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400' },
  youtube: { icon: Play, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
  whatsapp: { icon: MessageCircle, className: ICON_STYLES.green },
  diaspora: { icon: Share2, className: ICON_STYLES.indigo },
  viber: { icon: Phone, className: ICON_STYLES.violet },
  github: { icon: Code2, className: 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300' },
}

const STEP_ICONS: IconType[] = [Contact, Briefcase, Share2]

const inputClasses =
  'w-full text-sm rounded-lg border border-input-border bg-input-bg text-text px-2.5 py-1.5 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand'

function Field({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (value: string) => void }) {
  const Icon = field.icon
  // Only runs once the field is non-empty, so an untouched required field
  // doesn't get nagged with a format error before the user's typed anything.
  const error = field.validate && value.trim() ? field.validate(value.trim()) : null
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </span>
      <div className="relative flex items-center">
        {Icon && <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />}
        {field.type === 'select' ? (
          <>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClasses} ${Icon ? 'pl-9' : ''} appearance-none pr-9`}>
              {!value && <option value="">{field.placeholder ?? `Select ${field.label.toLowerCase()}`}</option>}
              {field.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-faint" />
          </>
        ) : field.type === 'file' ? (
          // No upload endpoint confirmed on the backend — stays visual-only.
          <input
            type="file"
            disabled
            className={`${inputClasses} ${Icon ? 'pl-9' : ''} file:mr-3 file:rounded-md file:border-0 file:bg-surface-hover file:px-2.5 file:py-1 file:text-xs`}
          />
        ) : (
          <input
            type="text"
            inputMode={field.digitsOnly ? 'numeric' : undefined}
            maxLength={field.maxLength}
            value={value}
            onChange={(e) => {
              const raw = field.digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value
              onChange(field.maxLength ? raw.slice(0, field.maxLength) : raw)
            }}
            className={`${inputClasses} ${Icon ? 'pl-9' : ''} ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}`}
          />
        )}
      </div>
      {/* Reserves its line whether or not `error` is currently set, so a
          validated field (e.g. Tpin) doesn't shift the grid row below it
          every time the message appears/disappears mid-typing. */}
      {field.validate && <span className="block min-h-[14px] text-xs text-danger">{error}</span>}
    </label>
  )
}

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

function SocialField({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (value: string) => void }) {
  const meta = SOCIAL_META[field.key]
  const BadgeIcon = meta?.icon
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">{field.label}</span>
      <div className="flex items-center gap-2.5 w-full rounded-lg border border-input-border bg-input-bg pl-1.5 pr-3 py-1.5 transition-shadow focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand">
        <span className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${meta?.className ?? 'bg-surface-hover text-text-muted'}`}>
          {BadgeIcon ? <BadgeIcon size={14} /> : meta?.badge}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${field.label} username or link`}
          className="w-full bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
        />
      </div>
    </label>
  )
}

// Groups a step's fields under their `section` heading, preserving first-seen
// section order — purely a display grouping, doesn't touch submitted values.
function groupFields(fields: FieldSpec[]): { section: string; fields: FieldSpec[] }[] {
  const order: string[] = []
  const bySection = new Map<string, FieldSpec[]>()
  for (const field of fields) {
    const section = field.section ?? ''
    if (!bySection.has(section)) {
      bySection.set(section, [])
      order.push(section)
    }
    bySection.get(section)!.push(field)
  }
  return order.map((section) => ({ section, fields: bySection.get(section)! }))
}

function StepFields({
  fields,
  values,
  setValues,
}: {
  fields: FieldSpec[]
  values: Record<string, string>
  setValues: Dispatch<SetStateAction<Record<string, string>>>
}) {
  const setField = (key: string) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }))
  return (
    <div className="space-y-6">
      {groupFields(fields).map(({ section, fields: sectionFields }) => {
        const SectionIcon = SECTION_ICONS[section]
        return (
          <div key={section || 'default'}>
            {section && (
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                {SectionIcon && <SectionIcon size={14} className="text-brand" />}
                <h4 className="text-xs font-semibold text-text-faint uppercase tracking-wide">{section}</h4>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
              {sectionFields.map((field) =>
                field.type === 'name' ? (
                  <NameField key={field.key} values={values} setValues={setValues} required={field.required} />
                ) : (
                  <Field key={field.key} field={field} value={values[field.key]} onChange={setField(field.key)} />
                ),
              )}
            </div>
          </div>
        )
      })}
    </div>
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
    // firstName/lastName/nameTitle back the compound NameField below; `name`
    // itself is kept in sync as their combined value on every keystroke.
    const init: Record<string, string> = { firstName: '', lastName: '', nameTitle: 'Mr' }
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
    // by comparing societe/card.php?type=c vs type=p directly.
    if (values.prospectCustomer === 'Prospect' && !values.thirdPartyType) {
      setFormError('Third-party type is required for prospects.')
      setStep(0)
      return
    }
    createMutation.mutate()
  }

  const isLastStep = step === steps.length - 1

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
          stick early and cover the last couple of rows. */}
      <Card className="!h-auto flex-1 min-h-0">
        {step === 2 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Share2 size={14} className="text-brand" />
                <h4 className="text-xs font-semibold text-text-faint uppercase tracking-wide">Social Profiles</h4>
              </div>
              <span className="text-xs text-text-faint">All fields optional</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
              {STEP3_FIELDS.map((field) => (
                <SocialField key={field.key} field={field} value={values[field.key]} onChange={setField(field.key)} />
              ))}
            </div>
          </div>
        ) : (
          <StepFields fields={steps[step].fields} values={values} setValues={setValues} />
        )}
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
