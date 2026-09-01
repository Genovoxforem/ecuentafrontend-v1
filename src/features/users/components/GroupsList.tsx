import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UsersRound, Plus, Pencil, Copy } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useUserGroupsList } from '../userGroupsAndTags.queries'
import { formatDate } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

// Real via user/group/user-groups-sidebarlist-ajax.php (see
// userGroupsAndTags.queries.ts's header comment for why the reference
// page's "Total N users" count and avatar stack aren't reproduced here —
// no JSON source for that number exists, only the legacy page's own HTML,
// which this app's rules say not to scrape). "Edit Role"/"Duplicate role"
// link out to the real legacy card.php, which isn't rebuilt in this pass.
export function GroupsList() {
  const { data: groups, isLoading, isError, error, refetch } = useUserGroupsList()
  const [search, setSearch] = useState('')

  const filtered = (groups ?? []).filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <UsersRound size={20} className="text-brand" /> List of Groups
        </h2>
        <Link to={ROUTES.userGroupCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add New Role
        </Link>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search roles…"
        className="w-full max-w-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 text-sm"
      />

      {isLoading && <LegacyLoadingCard label="Loading groups…" />}
      {isError && <LegacyErrorCard title="Couldn't load groups" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {groups && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-faint italic sm:col-span-2 xl:col-span-3">No roles match "{search}".</p>
          ) : (
            filtered.map((group) => (
              <Card key={group.id} className="gap-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-text-faint">Created {group.createdAt ? formatDate(group.createdAt) : '—'}</span>
                </div>
                <p className="text-base font-semibold text-text!">{group.name}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <Link
                    to={ROUTES.userGroupEdit.replace(':id', String(group.id))}
                    title="Permissions editing has no real API — read-only preview matching the legacy layout"
                    className="flex items-center gap-1 text-sm text-brand hover:underline"
                  >
                    <Pencil size={12} /> Edit Role
                  </Link>
                  <Link
                    to={ROUTES.userGroupEdit.replace(':id', String(group.id))}
                    title="Duplicate role — no real API, same read-only preview"
                    className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text-muted"
                  >
                    <Copy size={14} />
                  </Link>
                </div>
              </Card>
            ))
          )}

          <Card className="gap-3 items-center justify-center text-center">
            <Plus size={20} className="text-text-faint" />
            <Link to={ROUTES.userGroupCreate} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
              Add New Role
            </Link>
            <p className="text-xs text-text-faint">Add new role, if it doesn't exist.</p>
          </Card>
        </div>
      )}
    </div>
  )
}
