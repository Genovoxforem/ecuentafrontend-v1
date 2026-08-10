import { useLocalCollection, todayIso } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'

export interface UserRow {
  login: string
  name: string
  employee: boolean
  phone: string
  email: string
  gender: string
  designation: string
  lastLogin: string
  status: 'Enabled' | 'Disabled'
  isAdmin: boolean
  isPos: boolean
  isKot: boolean
}

export interface UsersSummary {
  totalUsers: number
  admins: number
  adminsPos: number
  adminsKot: number
  superAdmins: number
  activeUsers: number
  todayLoginUsers: number
  users: UserRow[]
}

const SEED: UsersSummary = {
  totalUsers: 0,
  admins: 0,
  adminsPos: 0,
  adminsKot: 0,
  superAdmins: 0,
  activeUsers: 0,
  todayLoginUsers: 0,
  users: [],
}

const KEY = ['local', 'users'] as const

// No user/list endpoint exists on this app's server beyond the single
// logged-in user's own profile (GET /user/). Held in react-query's cache
// only — see shared/localCollection.ts — so adding a user here feels real
// in the browser but never persists anywhere, and doesn't create an
// actual login.
export function useUsersSummary() {
  const [data] = useLocalCollection(KEY, SEED)
  return { data, isError: false, isLoading: false }
}

// Used by payroll.queries.ts — count of locally-added users flagged as
// employees. Doesn't include the real logged-in admin (they're not a
// UserRow at all, just the account this session is authenticated as);
// callers that want that counted too add 1 themselves.
export function useEmployeeCount() {
  const [data] = useLocalCollection(KEY, SEED)
  return data.users.filter((u) => u.employee).length
}

export interface NewUserInput {
  login: string
  firstname: string
  lastname: string
  email?: string
  phone?: string
  gender?: string
  designation?: string
  isAdmin: boolean
  isPos?: boolean
  isKot?: boolean
}

export function useCreateUser() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  const { user } = useAuth()
  return (input: NewUserInput) => {
    const row: UserRow = {
      login: input.login,
      name: `${input.firstname} ${input.lastname}`.trim(),
      employee: true,
      phone: input.phone ?? '',
      email: input.email ?? '',
      gender: input.gender ?? '',
      designation: input.designation ?? '',
      lastLogin: todayIso(),
      status: 'Enabled',
      isAdmin: input.isAdmin,
      isPos: input.isPos ?? false,
      isKot: input.isKot ?? false,
    }
    update((current) => ({
      ...current,
      totalUsers: current.totalUsers + 1,
      admins: current.admins + (input.isAdmin ? 1 : 0),
      adminsPos: current.adminsPos + (input.isPos ? 1 : 0),
      adminsKot: current.adminsKot + (input.isKot ? 1 : 0),
      activeUsers: current.activeUsers + 1,
      todayLoginUsers: current.todayLoginUsers,
      users: [row, ...current.users],
    }))
    const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    logActivity({ label: `New user ${row.name} (${row.login}) added`, category: 'other', authorName })
  }
}
