import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UsersRound, Check, X } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'

// Visual scaffold: no backend/local-collection for groups yet, so
// "Create group" just returns to the groups list rather than adding a row —
// same non-functional-but-honest pattern as the Reports/Settings pages.
export function GroupCreateForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <UsersRound size={20} className="text-brand" /> New Group
      </h2>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
          <Field label="Environment">
            <select defaultValue="Master entity" className={inputClasses}>
              <option>Master entity</option>
            </select>
          </Field>
          <Field label="Name" required>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Description">
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTES.userGroupList)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Check size={14} /> Create group
        </button>
        <Link to={ROUTES.userGroupList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      </div>
    </div>
  )
}
