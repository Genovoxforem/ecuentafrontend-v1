import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserRound, Check, X, LoaderCircle, RefreshCcw } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useCreateUser } from '../users.queries'

function randomApiKey() {
  return Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
}

function SectionHeading({ children }: { children: string }) {
  return <h3 className="col-span-full text-xs font-semibold uppercase tracking-wide text-text-faint pb-1 border-b border-border first:pt-0 pt-2">{children}</h3>
}

export function UserCreateForm() {
  const createUser = useCreateUser()
  const navigate = useNavigate()

  const [login, setLogin] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [designation, setDesignation] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isPos, setIsPos] = useState(false)
  const [isKot, setIsKot] = useState(false)
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  // Everything below is visual-scaffold only, matching the reference "New
  // user" screen's field set — none of it is sent to createUser() or
  // reflected in the users list, same as this feature's local-only data
  // (see users.queries.ts) not persisting anywhere to begin with.
  const [title, setTitle] = useState('')
  const [isEmployee, setIsEmployee] = useState(true)
  const [apiKey, setApiKey] = useState(randomApiKey)
  const [supervisor, setSupervisor] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [timeSheetDevice, setTimeSheetDevice] = useState('')
  const [address, setAddress] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [stateProvince, setStateProvince] = useState('')
  const [tpin, setTpin] = useState('')

  function handleSubmit() {
    setFormError('')
    if (!login.trim() || !firstname.trim() || !lastname.trim()) {
      setFormError('Login, first name, and last name are required.')
      return
    }
    setPending(true)
    createUser({ login: login.trim(), firstname, lastname, email, phone, gender, designation, isAdmin, isPos, isKot })
    setPending(false)
    navigate(ROUTES.usersDashboard)
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <UserRound size={20} className="text-brand" /> New User
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.usersDashboard} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create user
        </button>
      }
    >
      <Card className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <SectionHeading>Identity</SectionHeading>
          <Field label="Title">
            <select value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses}>
              <option value="">Select a title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
            </select>
          </Field>
          <Field label="First name" required>
            <input type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Last name" required>
            <input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Login" required>
            <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Gender">
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClasses}>
              <option value="">Not specified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </Field>
          <Field label="Designation">
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputClasses} placeholder="e.g. Cashier, Accountant" />
          </Field>

          <SectionHeading>Access</SectionHeading>
          <Field label="Admin access">
            <select value={isAdmin ? 'Yes' : 'No'} onChange={(e) => setIsAdmin(e.target.value === 'Yes')} className={inputClasses}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </Field>
          <Field label="Employee">
            <select value={isEmployee ? 'Yes' : 'No'} onChange={(e) => setIsEmployee(e.target.value === 'Yes')} className={inputClasses}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </Field>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-text">POS/KOT User Token</span>
            <div className="flex items-center gap-4 h-[38px]">
              <label className="flex items-center gap-1.5 text-sm text-text-muted">
                <input type="checkbox" checked={isPos} onChange={(e) => setIsPos(e.target.checked)} className="rounded border-input-border text-brand focus:ring-brand/30" />
                POS User
              </label>
              <label className="flex items-center gap-1.5 text-sm text-text-muted">
                <input type="checkbox" checked={isKot} onChange={(e) => setIsKot(e.target.checked)} className="rounded border-input-border text-brand focus:ring-brand/30" />
                KOT User
              </label>
            </div>
          </div>
          <Field label="Key for API">
            <div className="flex items-center gap-2">
              <input type="text" readOnly value={apiKey} className={`${inputClasses} font-mono text-xs`} />
              <button type="button" onClick={() => setApiKey(randomApiKey())} title="Regenerate" className="shrink-0 p-2 rounded-md border border-input-border text-text-muted hover:bg-surface-hover">
                <RefreshCcw size={14} />
              </button>
            </div>
          </Field>

          <SectionHeading>Work profile</SectionHeading>
          <Field label="Supervisor">
            <input type="text" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} className={inputClasses} placeholder="Select a user" />
          </Field>
          <Field label="Employee Id">
            <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Time Sheet Device">
            <input type="text" value={timeSheetDevice} onChange={(e) => setTimeSheetDevice(e.target.value)} className={inputClasses} placeholder="Select a device" />
          </Field>

          <SectionHeading>Contact</SectionHeading>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Phone">
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Tpin/Aadhar">
            <input type="text" value={tpin} onChange={(e) => setTpin(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Address">
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="City">
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Zip Code">
            <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Country">
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClasses} placeholder="Select country" />
          </Field>
          <Field label="State/Province">
            <input type="text" value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} className={inputClasses} />
          </Field>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
