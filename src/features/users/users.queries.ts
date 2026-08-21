import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { formatDateTimeAmPm } from '../../utils/format'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'

export interface LanguageOption {
  code: string
  label: string
}

// POSIX-style locale ("en_US") -> a human label ("English (United States)")
// via the browser's own Intl.DisplayNames, since GET /api/languages/ (below)
// returns bare codes with no display names of its own. Falls back to the
// raw code on anything Intl can't resolve (older browsers, odd locales)
// rather than throwing.
function languageLabel(code: string): string {
  try {
    const [langSubtag, regionSubtag] = code.replace('_', '-').split('-')
    // Feeding just the bare language subtag (not the full "sq-AL" tag) to
    // the "language" DisplayNames lookup matters: some Intl implementations
    // already fold the region into that name for a full locale tag (e.g.
    // "Albanian (Albania)"), which then duplicated once this appended its
    // own "(region)" on top — "Albanian (Albania) (Albania)".
    const lang = new Intl.DisplayNames(['en'], { type: 'language' }).of(langSubtag)
    const region = regionSubtag ? new Intl.DisplayNames(['en'], { type: 'region' }).of(regionSubtag) : undefined
    return lang && region ? `${lang} (${region})` : (lang ?? code)
  } catch {
    return code
  }
}

interface LanguagesResponse {
  success: boolean
  available_languages: string[]
}

// GET /api/languages/ — this app's own i18n/translation-strings endpoint
// (see api/language/index.php), not a purpose-built "language dictionary"
// API, but its available_languages array is a real, live list of every
// locale the backend actually supports — used here as the New User form's
// "Language default" options.
export function useLanguageOptions() {
  return useQuery({
    queryKey: ['languages', 'options'],
    queryFn: async (): Promise<LanguageOption[]> => {
      const { data } = await api.get<LanguagesResponse>('/languages/')
      return data.available_languages.map((code) => ({ code, label: languageLabel(code) })).sort((a, b) => a.label.localeCompare(b.label))
    },
    staleTime: 1000 * 60 * 60,
  })
}

export interface UserRow {
  id: number
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
  isSuperAdmin: boolean
}

export interface UsersSummary {
  totalUsers: number
  admins: number
  superAdmins: number
  activeUsers: number
  todayLoginUsers: number
  users: UserRow[]
}

// Raw shape as returned by GET /api/users/ — id/admin/superAdmin/employee/
// enabled come back as real JSON booleans/numbers here (unlike GET /user/'s
// stringified flags — see auth.api.ts's RawUser comment), so no extra
// coercion is needed beyond the ?? fallbacks below.
interface RawUserItem {
  id: number
  login: string
  name: string
  admin: boolean
  superAdmin: boolean
  employee: boolean
  gender: string | null
  phone: string | null
  email: string | null
  designation: string | null
  lastLogin: string | null
  enabled: boolean
}

interface SummaryPayload {
  totalUsers: number
  admins: number
  superAdmins: number
  activeUsers: number
  todayLoginUsers: number
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

const QUERY_KEY = ['users', 'summary'] as const

function toRow(item: RawUserItem): UserRow {
  return {
    id: item.id,
    login: item.login,
    name: item.name ?? '',
    employee: item.employee,
    phone: item.phone ?? '',
    email: item.email ?? '',
    gender: item.gender ?? '',
    designation: item.designation ?? '',
    lastLogin: item.lastLogin ? formatDateTimeAmPm(item.lastLogin) : '',
    status: item.enabled ? 'Enabled' : 'Disabled',
    isAdmin: item.admin,
    isSuperAdmin: item.superAdmin,
  }
}

// GET /api/users/summary/ (stat-card counts) + GET /api/users/ (the row
// list, limit: 500 — web_pagination()'s own clamp ceiling, same as
// customers/list — fetched once and paginated client-side by UsersOverview).
export function useUsersSummary() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<UsersSummary> => {
      const [summaryRes, listRes] = await Promise.all([
        api.get<WebEnvelope<SummaryPayload>>('/users/summary/'),
        api.get<WebEnvelope<{ users: RawUserItem[]; total: number }>>('/users/', { params: { page: 1, limit: 500 } }),
      ])
      const s = summaryRes.data.data
      return {
        totalUsers: s.totalUsers,
        admins: s.admins,
        superAdmins: s.superAdmins,
        activeUsers: s.activeUsers,
        todayLoginUsers: s.todayLoginUsers,
        users: listRes.data.data.users.map(toRow),
      }
    },
    staleTime: 1000 * 60,
  })
}

// Looks up one user by id out of the already-fetched summary list (see
// useUsersSummary) — no separate GET /api/users/:id/ endpoint exists, and
// none is needed since the list is fetched in full already.
export function useUser(id: string | number | undefined) {
  const { data, isLoading } = useUsersSummary()
  const numericId = typeof id === 'string' ? Number(id) : id
  const user = numericId !== undefined && !Number.isNaN(numericId) ? data?.users.find((u) => u.id === numericId) : undefined
  return { user, isLoading }
}

// Raw shape from GET /api/users/detail/?id= (api/users/detail/index.php) —
// real, direct SQL against llx_user (address/zip/town/country/state,
// creation date+creator, supervisor, salary/thm/tjm/weeklyhours, employment
// and login-validity date ranges, birth, notes, social links). Built for
// this exact page (its own header comment says so: "matching
// htdocs/user/card.php's view mode") but was never wired up — UserDetail.tsx
// used only the narrower list-row shape from useUser above, which is why the
// User tab's Supervisor/Salary/Employment/Address fields, and the left
// panel's Created-on/Created-by, showed blank despite this real data
// existing all along.
export interface UserDetailData {
  id: number
  login: string
  name: string
  admin: boolean
  superAdmin: boolean
  employee: boolean
  gender: string | null
  job: string | null
  address: string | null
  zip: string | null
  town: string | null
  countryLabel: string | null
  stateLabel: string | null
  mobile: string | null
  officePhone: string | null
  officeFax: string | null
  email: string | null
  enabled: boolean
  lastLogin: string | null
  createdAt: string | null
  creatorLogin: string | null
  note: string | null
  dateEmployment: string | null
  dateEmploymentEnd: string | null
  dateStartValidity: string | null
  dateEndValidity: string | null
  birth: string | null
  supervisorName: string | null
  salary: number | null
  hourlyCost: number | null
  dailyCost: number | null
  weeklyHours: number | null
}

export function useUserDetail(id: string | number | undefined) {
  const numericId = typeof id === 'string' ? Number(id) : id
  const query = useQuery({
    queryKey: ['users', 'detail', numericId],
    queryFn: async (): Promise<UserDetailData> => {
      const { data } = await api.get<WebEnvelope<UserDetailData>>('/users/detail/', { params: { id: numericId } })
      return data.data
    },
    enabled: numericId !== undefined && !Number.isNaN(numericId),
  })
  return { detail: query.data, isLoading: query.isLoading }
}

// GET /api/customers/list/'s creatorName (see customers.queries.ts) is a
// display name, not a user id — there's no creator-id field on that
// endpoint to link against directly. This resolves it against the real
// users list on a best-effort basis: only returns an id when exactly one
// user matches that name, so a duplicate display name (there are a couple
// in this dataset — see users.queries.ts's toRow) never links to the wrong
// profile. Returns undefined (renders as plain text, not a broken link)
// whenever the match isn't unambiguous.
export function useUserIdByName(name: string | undefined) {
  const { data } = useUsersSummary()
  if (!name || !data) return undefined
  const matches = data.users.filter((u) => u.name === name)
  return matches.length === 1 ? matches[0].id : undefined
}

// Used by payroll.queries.ts — count of real users flagged as employees.
// Doesn't include the real logged-in admin (they're not a UserRow at all,
// just the account this session is authenticated as); callers that want
// that counted too add 1 themselves. 0 while the summary is still loading,
// same "honest placeholder" reasoning as payroll's own money fields.
export function useEmployeeCount() {
  const { data } = useUsersSummary()
  return data?.users.filter((u) => u.employee).length ?? 0
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
}

let optimisticSequence = -1

// No POST /api/users/ endpoint exists yet, so this can't actually create the
// user server-side — it optimistically merges a row into the real summary's
// react-query cache instead, same "feels real in the browser but doesn't
// persist" caveat as every other local-only scaffold, just layered on top of
// genuinely fetched data instead of an empty local seed. A refetch (page
// reload) drops it, since the server was never told about it.
export function useCreateUser() {
  const queryClient = useQueryClient()
  const logActivity = useLogActivity()
  const { user } = useAuth()
  return (input: NewUserInput) => {
    const row: UserRow = {
      id: optimisticSequence--,
      login: input.login,
      name: `${input.firstname} ${input.lastname}`.trim(),
      employee: true,
      phone: input.phone ?? '',
      email: input.email ?? '',
      gender: input.gender ?? '',
      designation: input.designation ?? '',
      lastLogin: '',
      status: 'Enabled',
      isAdmin: input.isAdmin,
      isSuperAdmin: false,
    }
    queryClient.setQueryData<UsersSummary>(QUERY_KEY, (current) =>
      current
        ? {
            ...current,
            totalUsers: current.totalUsers + 1,
            admins: current.admins + (input.isAdmin ? 1 : 0),
            activeUsers: current.activeUsers + 1,
            users: [row, ...current.users],
          }
        : current,
    )
    const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    logActivity({ label: `New user ${row.name} (${row.login}) added`, category: 'other', authorName })
  }
}
