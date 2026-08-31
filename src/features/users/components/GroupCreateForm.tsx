import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UsersRound, Check, X, Loader2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useCreateUserGroup } from '../userGroupsAndTags.queries'

// Real via user/group/ajax_group.php?action=create_group (see
// userGroupsAndTags.queries.ts's header comment — read that file's PHP
// source directly, confirmed it performs the same UserGroup->create($user)
// as the legacy "New Group"/"Add New Role" modal). "Environment: Master
// entity" is kept as a fixed value rather than a real dropdown — this
// backend has no multi-entity setup, so every group really is created
// under the master entity; nothing is invented, just not offered as a
// choice that wouldn't do anything differently.
export function GroupCreateForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const create = useCreateUserGroup()

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <UsersRound size={20} className="text-brand" /> New Group
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.userGroupList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          disabled={!name.trim() || create.isPending}
          onClick={() => create.mutate({ name: name.trim(), note: description.trim() }, { onSuccess: () => navigate(ROUTES.userGroupList) })}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:bg-neutral-bg disabled:text-text-faint"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create group
        </button>
      }
    >
      <Card className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
          <Field label="Environment">
            <select disabled defaultValue="Master entity" className={inputClasses}>
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
        {create.isError && <p className="text-sm text-danger mt-3">{create.error instanceof Error ? create.error.message : 'Failed to create group.'}</p>}
      </Card>
    </StickyFormShell>
  )
}
