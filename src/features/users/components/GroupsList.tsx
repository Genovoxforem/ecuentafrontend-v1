import { Link } from 'react-router-dom'
import { UsersRound, Plus, Pencil, Copy } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'

interface GroupRow {
  name: string
  totalUsers: number
  members: string[]
}

// Visual scaffold, matching the reference "List of groups" card grid —
// static placeholder roles rather than the local-only Users collection,
// since groups/role-membership isn't modeled anywhere yet.
const GROUPS: GroupRow[] = [
  { name: 'Administrators', totalUsers: 2, members: ['Voxforem Admin', 'Mona Manager'] },
  { name: 'Sales Team', totalUsers: 5, members: ['Sal S', 'Dev D', 'Chita C', 'Anila A', 'Ashwin A'] },
  { name: 'Warehouse Staff', totalUsers: 3, members: ['Guru', 'Ashok', 'Stephen'] },
  { name: 'POS Cashiers', totalUsers: 4, members: ['Pos12', 'Abi A', 'Sridhar S', 'Cathy Cashier'] },
  { name: 'Accounting', totalUsers: 1, members: ['Customer1'] },
  { name: 'Kitchen Staff', totalUsers: 0, members: [] },
]

const STACK_COLORS = ['bg-purple-500', 'bg-teal-500', 'bg-rose-500', 'bg-blue-500', 'bg-amber-500']

function MemberStack({ members }: { members: string[] }) {
  const shown = members.slice(0, 3)
  const overflow = members.length - shown.length
  if (members.length === 0) return null
  return (
    <div className="flex items-center -space-x-2">
      {overflow > 0 && (
        <span className="w-7 h-7 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold flex items-center justify-center ring-2 ring-surface-alt">
          +{overflow}
        </span>
      )}
      {shown.map((name, i) => (
        <Avatar key={name} name={name} size={28} color={STACK_COLORS[i % STACK_COLORS.length]} className="text-[10px] ring-2 ring-surface-alt" />
      ))}
    </div>
  )
}

export function GroupsList() {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {GROUPS.map((group) => (
          <Card key={group.name} className="gap-3">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-text-faint">
                Total {group.totalUsers} {group.totalUsers === 1 ? 'user' : 'users'}
              </span>
              <MemberStack members={group.members} />
            </div>
            <p className="text-base font-semibold text-text!">{group.name}</p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <button type="button" className="flex items-center gap-1 text-sm text-brand hover:underline">
                <Pencil size={12} /> Edit Role
              </button>
              <button type="button" title="Duplicate role" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text-muted">
                <Copy size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
