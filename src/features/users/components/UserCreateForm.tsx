import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  UserRound,
  Check,
  X,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  Contact,
  Briefcase,
  Share2,
  User,
  Shield,
  UserCheck,
  UserCog,
  Globe,
  Phone,
  Mail,
  IdCard,
  Hash,
  MapPin,
  Map as MapIcon,
  Server,
  RefreshCcw,
  Palette,
  Tags,
  Languages,
  FileText,
  PenLine,
  CalendarClock,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { type FieldSpec, type IconType, inputClasses, StepFields } from '../../../shared/components/forms/StepFormFields'
import { SocialLinksStep } from '../../../shared/components/forms/SocialLinksStep'
import { todayIso } from '../../../shared/localCollection'
import { useCreateUserReal, useUserWizardOptions, useUserStateOptions, useUsersSummary, useLanguageOptions, useUserIdByName } from '../users.queries'

const STEP_ICONS: IconType[] = [Contact, Briefcase, Share2]
const GENDER_TO_REAL: Record<string, 'man' | 'woman' | ''> = { Male: 'man', Female: 'woman', '': '' }

function randomApiKey() {
  return Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
}

function PosKotField({ isPos, isKot, onChange }: { isPos: boolean; isKot: boolean; onChange: (next: { isPos: boolean; isKot: boolean }) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">POS/KOT User Token</span>
      <div className="flex items-center gap-4 h-[34px]">
        <label className="flex items-center gap-1.5 text-sm text-text-muted">
          <input type="checkbox" checked={isPos} onChange={(e) => onChange({ isPos: e.target.checked, isKot })} className="rounded border-input-border text-brand focus:ring-brand/30" />
          POS User
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-muted">
          <input type="checkbox" checked={isKot} onChange={(e) => onChange({ isPos, isKot: e.target.checked })} className="rounded border-input-border text-brand focus:ring-brand/30" />
          KOT User
        </label>
      </div>
    </div>
  )
}

function ApiKeyField({ value, onRegenerate }: { value: string; onRegenerate: () => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">Key for API</span>
      <div className="flex items-center gap-2">
        <input type="text" readOnly value={value} className={`${inputClasses} font-mono text-xs`} />
        <button type="button" onClick={onRegenerate} title="Regenerate" className="shrink-0 p-2 rounded-md border border-input-border text-text-muted hover:bg-surface-hover">
          <RefreshCcw size={14} />
        </button>
      </div>
    </label>
  )
}

function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">Color of the user</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-[34px] w-12 shrink-0 rounded-md border border-input-border bg-input-bg p-1" />
        <input type="text" readOnly value={value} className={`${inputClasses} font-mono text-xs`} />
      </div>
    </label>
  )
}

function DateRangeField({
  label,
  icon: Icon,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  label: string
  icon: IconType
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}) {
  const nowBtnCls = 'shrink-0 rounded-md border border-input-border px-2 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover'
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <Icon size={13} /> {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className={`${inputClasses} w-auto`} />
        <button type="button" onClick={() => onFromChange(todayIso())} className={nowBtnCls}>
          Now
        </button>
        <span className="text-text-faint">-</span>
        <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className={`${inputClasses} w-auto`} />
        <button type="button" onClick={() => onToChange(todayIso())} className={nowBtnCls}>
          Now
        </button>
      </div>
    </div>
  )
}

export function UserCreateForm() {
  const { data: usersSummary } = useUsersSummary()
  const { data: languageOptions } = useLanguageOptions()
  const { data: wizardOptions } = useUserWizardOptions()
  const createUser = useCreateUserReal()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({
    title: '',
    firstName: '',
    lastName: '',
    isAdmin: 'No',
    designation: '',
    gender: '',
    employee: 'Yes',
    supervisor: '',
    expenseValidator: '',
    externalUser: 'Internal',
    address: '',
    zipCode: '',
    city: '',
    country: '',
    stateProvince: '',
    tpin: '',
    mobile: '',
    employeeId: '',
    email: '',
    timeSheetDevice: '',
    employeeNrc: '',
    tagsCategories: '',
    languageDefault: '',
    note: '',
    signature: '',
    dateOfBirth: '',
  })
  const [isPos, setIsPos] = useState(false)
  const [isKot, setIsKot] = useState(false)
  const [apiKey, setApiKey] = useState(randomApiKey)
  const [userColor, setUserColor] = useState('#397db9')
  const [employmentFrom, setEmploymentFrom] = useState('')
  const [employmentTo, setEmploymentTo] = useState('')
  const [loginValidityFrom, setLoginValidityFrom] = useState('')
  const [loginValidityTo, setLoginValidityTo] = useState('')
  const [formError, setFormError] = useState('')

  const setField = (key: string) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  // Real names from the live GET /api/users/ list (see users.queries.ts) —
  // same data backing the Users list page, reused here so Supervisor and
  // Force expense report validator pick from actual users instead of a
  // fake/empty list.
  const userOptions = (usersSummary?.users ?? []).map((u) => u.name || u.login)
  const languageSelectOptions = (languageOptions ?? []).map((l) => l.label)

  // Everything below is real GET userprofile/api/users.php?action=
  // wizard_options data (see users.queries.ts) — the exact backend behind
  // this real wizard. Selects store the display label in `values`, resolved
  // back to the real id/code at submit time against these same lists.
  const civilityOptions = (wizardOptions?.civilities ?? []).map((c) => c.name)
  const designationOptions = wizardOptions?.designations ?? []
  const countryOptions = (wizardOptions?.countries ?? []).map((c) => c.name)
  const deviceOptions = (wizardOptions?.devices ?? []).map((d) => d.name)
  const selectedCountryId = wizardOptions?.countries.find((c) => c.name === values.country)?.id
  const { data: stateOptionsData } = useUserStateOptions(selectedCountryId)
  const stateOptions = (stateOptionsData ?? []).map((s) => s.name)

  const IDENTITY_FIELDS: FieldSpec[] = [
    { key: 'title', label: 'Title', type: 'select', options: civilityOptions, icon: User, placeholder: 'Select a title' },
    { key: 'firstName', label: 'First name', type: 'text', required: true, icon: User },
    { key: 'lastName', label: 'Last name', type: 'text', required: true, icon: User },
    { key: 'isAdmin', label: `Is Admin User? (Used: ${wizardOptions?.tokens.activeUsed ?? 0} / Total: ${wizardOptions?.tokens.activeTotal ?? 0})`, type: 'select', options: ['No', 'Yes'], defaultValue: 'No', icon: Shield },
    { key: 'posKotToken', label: `POS/KOT User Token (Used: ${wizardOptions?.tokens.posUsed ?? 0} / Total: ${wizardOptions?.tokens.posTotal ?? 0})`, type: 'text', icon: Shield },
    { key: 'apiKey', label: 'Key for API', type: 'text', icon: Shield },
    { key: 'designation', label: 'Designation', type: 'select', options: designationOptions, required: true, icon: Briefcase, placeholder: 'Select a designation' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], icon: UserCheck },
    { key: 'employee', label: 'Employee', type: 'select', options: ['Yes', 'No'], defaultValue: 'Yes', icon: UserCheck },
    { key: 'supervisor', label: 'Supervisor', type: 'select', options: userOptions, icon: UserCog, placeholder: 'Select a users' },
    { key: 'expenseValidator', label: 'Force expense report validator', type: 'select', options: userOptions, icon: UserCheck, placeholder: 'Select a users' },
    { key: 'externalUser', label: 'External user?', type: 'select', options: ['Internal', 'External'], defaultValue: 'Internal', icon: Globe },
    { key: 'address', label: 'Address', type: 'text', icon: MapPin },
    { key: 'zipCode', label: 'Zip Code', type: 'text', icon: MapPin },
    { key: 'city', label: 'City', type: 'text', icon: MapPin },
    { key: 'country', label: 'Country', type: 'select', options: countryOptions, icon: Globe, placeholder: 'Select Country' },
    { key: 'stateProvince', label: 'State/Province', type: 'select', options: stateOptions, icon: MapIcon, placeholder: 'Select a state' },
    { key: 'tpin', label: 'Tpin/Aadhar', type: 'text', icon: IdCard },
    { key: 'mobile', label: 'Mobile', type: 'text', icon: Phone },
    { key: 'employeeId', label: 'Employee Id', type: 'text', icon: Hash },
    { key: 'email', label: 'EMail', type: 'text', required: true, icon: Mail },
    { key: 'timeSheetDevice', label: 'Time Sheet Device', type: 'select', options: deviceOptions, icon: Server, placeholder: 'Select a device' },
  ]

  const WORK_FIELDS: FieldSpec[] = [
    { key: 'employeeNrc', label: 'Employee NRC', type: 'text', icon: IdCard },
    { key: 'userColor', label: 'Color of the user', type: 'text', icon: Palette },
    { key: 'tagsCategories', label: 'Tags/categories', type: 'text', icon: Tags },
    { key: 'languageDefault', label: 'Language default', type: 'select', options: languageSelectOptions, icon: Languages, placeholder: 'Select a language' },
    { key: 'note', label: 'Note', type: 'text', icon: FileText },
    { key: 'signature', label: 'Signature', type: 'text', icon: PenLine },
    { key: 'employment', label: 'Employment', type: 'text', icon: CalendarClock },
    { key: 'loginValidity', label: 'Date range of login validity', type: 'text', icon: CalendarClock },
    { key: 'dateOfBirth', label: 'Date of birth', type: 'date', icon: CalendarClock },
  ]

  const steps = [
    { title: 'Identity', fields: IDENTITY_FIELDS },
    { title: 'Work profile', fields: WORK_FIELDS },
    { title: 'Links', fields: [] as FieldSpec[] },
  ]
  const isLastStep = step === steps.length - 1

  const supervisorId = useUserIdByName(values.supervisor || undefined)
  const expenseValidatorId = useUserIdByName(values.expenseValidator || undefined)

  function handleSubmit() {
    setFormError('')
    if (!values.firstName.trim() || !values.lastName.trim()) {
      setFormError('First name and last name are required.')
      setStep(0)
      return
    }
    if (!values.designation.trim()) {
      setFormError('Designation is required.')
      setStep(0)
      return
    }
    if (!values.email.trim()) {
      setFormError('Email is required.')
      setStep(0)
      return
    }

    const civilityCode = wizardOptions?.civilities.find((c) => c.name === values.title)?.id
    const countryId = wizardOptions?.countries.find((c) => c.name === values.country)?.id
    const stateId = stateOptionsData?.find((s) => s.name === values.stateProvince)?.id
    const deviceId = wizardOptions?.devices.find((d) => d.name === values.timeSheetDevice)?.id
    const languageCode = languageOptions?.find((l) => l.label === values.languageDefault)?.code

    createUser.mutate(
      {
        firstname: values.firstName,
        lastname: values.lastName,
        email: values.email,
        civilityCode,
        gender: GENDER_TO_REAL[values.gender] ?? '',
        userMobile: values.mobile,
        employee: values.employee === 'Yes',
        isAdmin: values.isAdmin === 'Yes',
        job: values.designation,
        deviceId,
        uid: values.tpin,
        address: values.address,
        zip: values.zipCode,
        town: values.city,
        countryId,
        stateId,
        supervisorId,
        expenseValidatorId,
        isPosUser: isPos,
        isKotUser: isKot,
        apiKey: values.isAdmin === 'Yes' ? apiKey : undefined,
        color: userColor,
        defaultLang: languageCode,
        note: values.note,
        signature: values.signature,
        dateEmployment: employmentFrom || undefined,
        dateEmploymentEnd: employmentTo || undefined,
        dateStartValidity: loginValidityFrom || undefined,
        dateEndValidity: loginValidityTo || undefined,
        birth: values.dateOfBirth || undefined,
        social: {
          facebook: values.facebook ?? '',
          skype: values.skype ?? '',
          twitter: values.twitter ?? '',
          linkedin: values.linkedin ?? '',
          instagram: values.instagram ?? '',
          snapchat: values.snapchat ?? '',
          // SocialLinksStep/SOCIAL_LINK_FIELDS stores this one under the
          // camelCase key `googlePlus` — the real backend's own field name
          // (wizard_options' social_networks fallback list) is lowercase
          // `googleplus`, confirmed by reading userprofile/api/users.php.
          googleplus: values.googlePlus ?? '',
          youtube: values.youtube ?? '',
          whatsapp: values.whatsapp ?? '',
          diaspora: values.diaspora ?? '',
          viber: values.viber ?? '',
          github: values.github ?? '',
        },
      },
      {
        onSuccess: () => navigate(ROUTES.usersDashboard),
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create user.'),
      },
    )
  }

  return (
    <StickyFormShell
      headerClassName="pt-1.5 pb-2.5"
      header={
        <>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-10 rounded-xl bg-brand/10 text-brand shrink-0">
              <UserRound size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text!">New User</h2>
              <p className="text-xs text-text-faint">Create an internal user in your company/organization.</p>
            </div>
          </div>

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
        <Link to={ROUTES.usersDashboard} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-hover transition-colors">
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
              disabled={createUser.isPending}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60 transition-colors"
            >
              {createUser.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create user
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
      <Card className="!h-auto flex-1 min-h-0">
        {step === 2 ? (
          <SocialLinksStep values={values} onChange={setField} />
        ) : (
          <StepFields
            fields={steps[step].fields}
            values={values}
            setValues={setValues}
            renderField={(field) => {
              switch (field.key) {
                case 'posKotToken':
                  return (
                    <PosKotField
                      key={field.key}
                      isPos={isPos}
                      isKot={isKot}
                      onChange={({ isPos: p, isKot: k }) => {
                        setIsPos(p)
                        setIsKot(k)
                      }}
                    />
                  )
                case 'apiKey':
                  return <ApiKeyField key={field.key} value={apiKey} onRegenerate={() => setApiKey(randomApiKey())} />
                case 'userColor':
                  return <ColorField key={field.key} value={userColor} onChange={setUserColor} />
                case 'employment':
                  return (
                    <DateRangeField
                      key={field.key}
                      label="Employment"
                      icon={CalendarClock}
                      from={employmentFrom}
                      to={employmentTo}
                      onFromChange={setEmploymentFrom}
                      onToChange={setEmploymentTo}
                    />
                  )
                case 'loginValidity':
                  return (
                    <DateRangeField
                      key={field.key}
                      label="Date range of login validity"
                      icon={CalendarClock}
                      from={loginValidityFrom}
                      to={loginValidityTo}
                      onFromChange={setLoginValidityFrom}
                      onToChange={setLoginValidityTo}
                    />
                  )
                default:
                  return undefined
              }
            }}
          />
        )}
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
