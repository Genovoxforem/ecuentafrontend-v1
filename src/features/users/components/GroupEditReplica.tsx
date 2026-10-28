import { Link, useParams } from 'react-router-dom'
import { Check, UsersRound } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { formatDate } from '../../../utils/format'
import { useUserGroup } from '../userGroupsAndTags.queries'

// The group page (classic user/group/card.php): its name and description, its members and the permission matrix, from
// user/group/fapi/group.php. Read-only: the fapi writers (update, add / remove a member, grant / revoke a right, delete) only answer a plan
// and write nothing, so the permission boxes show what the group has but cannot be changed here.
export function GroupEditReplica() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useUserGroup(id)

  if (isLoading) return <LegacyLoadingCard label="Loading the role…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the role" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <UsersRound size={20} className="text-brand" /> {data.name}
      </h2>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-text-muted">Group Name</p>
            <p className="text-sm text-text!">{data.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted">Description</p>
            <p className="text-sm text-text!">{data.note || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted">Created</p>
            <p className="text-sm text-text!">{data.createdAt ? formatDate(data.createdAt) : '-'}</p>
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-text!">Users ({data.members.length})</div>
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
