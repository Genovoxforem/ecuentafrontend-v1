import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserRound, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useCreateUser } from '../users.queries'

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
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  function handleSubmit() {
    setFormError('')
    if (!login.trim() || !firstname.trim() || !lastname.trim()) {
      setFormError('Login, first name, and last name are required.')
      return
    }
    setPending(true)
    createUser({ login: login.trim(), firstname, lastname, email, phone, gender, designation, isAdmin })
    setPending(false)
    navigate(ROUTES.usersDashboard)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <UserRound size={20} className="text-brand" /> New User
      </h2>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Login" required>
            <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Admin access">
            <select value={isAdmin ? 'Yes' : 'No'} onChange={(e) => setIsAdmin(e.target.value === 'Yes')} className={inputClasses}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </Field>

          <Field label="First name" required>
            <input type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Last name" required>
            <input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Phone">
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClasses} />
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
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create user
        </button>
        <Link to={ROUTES.usersDashboard} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      </div>
    </div>
  )
}
