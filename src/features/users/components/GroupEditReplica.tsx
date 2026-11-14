import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, LoaderCircle, Pencil, Plus, Trash2, UserMinus, UsersRound, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { formatDate } from '../../../utils/format'
import { useDeleteUserGroup, useGroupMembership, useUpdateUserGroup, useUserGroup } from '../userGroupsAndTags.queries'
import { useUsersSummary } from '../users.queries'
import type { UserGroupDetail } from '../userGroupsFapi'

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

function GroupHeaderCard({ group }: { group: UserGroupDetail }) {
  const update = useUpdateUserGroup(group.id)
  const remove = useDeleteUserGroup()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(group.name)
  const [note, setNote] = useState(group.note)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) return setError('Group name is required.')
    setError('')
    try {
      await update.mutateAsync({ name, note })
      setEditing(false)
    } catch (e) {
      setError(message(e, 'Could not save this group.'))
    }
  }

  async function handleDelete() {
    setError('')
    if (!(await confirm({ title: 'Delete role', message: `Are you sure you want to delete ${group.name}?` }))) return
    try {
      await remove.mutateAsync(group.id)
      navigate(ROUTES.userGroupList)
    } catch (e) {
      setError(message(e, 'Could not delete this group.'))
    }
  }

  return (
    <Card className="!h-auto">
      {editing ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Group Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Description">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClasses} />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-text-muted">Group Name</p>
            <p className="text-sm text-text!">{group.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted">Description</p>
            <p className="text-sm text-text!">{group.note || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted">Created</p>
            <p className="text-sm text-text!">{group.createdAt ? formatDate(group.createdAt) : '-'}</p>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {(group.canEdit || group.canDelete) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <button type="button" onClick={save} disabled={update.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
                {update.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setName(group.name)
                  setNote(group.note)
                  setError('')
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover"
              >
                <X size={14} /> Cancel
              </button>
            </>
          ) : (
            <>
              {group.canEdit && (
                <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover">
                  <Pencil size={14} /> Modify
                </button>
              )}
              {group.canDelete && (
                <button type="button" onClick={handleDelete} disabled={remove.isPending} className="flex items-center gap-1.5 rounded-lg border border-danger/60 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger-bg disabled:opacity-60">
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}

function AddMember({ group }: { group: UserGroupDetail }) {
  const { data: users } = useUsersSummary()
  const { add } = useGroupMembership(group.id)
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const inGroup = new Set(group.members.map((m) => m.id))
  const candidates = (users?.users ?? []).filter((u) => !inGroup.has(u.id) && u.status === 'Enabled')

  async function submit() {
    if (!userId) return
    setError('')
    try {
      await add.mutateAsync(Number(userId))
      setUserId('')
    } catch (e) {
      setError(message(e, 'Could not add this user.'))
    }
  }

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className={`${inputClasses} max-w-xs`}>
          <option value="">Select a user</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.login}
            </option>
          ))}
        </select>
        <button type="button" onClick={submit} disabled={!userId || add.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {add.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />} Add user
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}

// The group page (classic user/group/card.php): its name and description, its members and the permission matrix, from
// user/group/fapi/group.php. Name / description, adding and removing a member and deleting the group run on that endpoint (its writers
// execute since 5 Nov 2026). The permission boxes show what the group has but cannot be changed here: granting or revoking a right is
// not one of the endpoint's writers.
export function GroupEditReplica() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useUserGroup(id)
  const { remove } = useGroupMembership(Number(id))
  const [memberError, setMemberError] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading the role…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the role" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  async function removeMember(userId: number) {
    setMemberError('')
    try {
      await remove.mutateAsync(userId)
    } catch (e) {
      setMemberError(message(e, 'Could not remove this user.'))
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <UsersRound size={20} className="text-brand" /> {data.name}
      </h2>

      <GroupHeaderCard key={`${data.id}:${data.name}:${data.note}`} group={data} />

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-text!">Users ({data.members.length})</div>
        {data.canEdit && <AddMember group={data} />}
        {memberError && <p className="px-4 py-2 text-sm text-danger">{memberError}</p>}
        {data.members.length === 0 ? (
          <p className="px-4 py-4 text-sm italic text-text-faint">No user in this role.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Login</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {data.canEdit && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <Link to={ROUTES.userDetail.replace(':id', String(m.id))} className="text-brand hover:underline">
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-text-muted">{m.login}</td>
                  <td className="px-4 py-2 text-text-muted">{m.email || '-'}</td>
                  <td className="px-4 py-2 text-text-muted">{m.active ? 'Enabled' : 'Disabled'}</td>
                  {data.canEdit && (
                    <td className="px-2 py-2 text-right">
                      <button type="button" title="Remove from group" onClick={() => removeMember(m.id)} disabled={remove.isPending} className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-danger disabled:opacity-60">
                        <UserMinus size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-text!">
          Permissions ({data.grantedTotal} of {data.total})
        </div>
        <div className="divide-y divide-border">
          {data.modules.map((m) => (
            <div key={m.module} className="px-4 py-3">
              <p className="mb-1.5 text-sm font-semibold capitalize text-text!">{m.label}</p>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
                {m.rights.map((r) => (
                  <label key={r.id} className="flex items-start gap-2 text-sm text-text-muted">
                    <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${r.granted ? 'border-brand bg-brand text-white' : 'border-input-border bg-input-bg'}`} aria-checked={r.granted} role="checkbox">
                      {r.granted && <Check size={11} />}
                    </span>
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
