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
    // api/users/ doesn't exist at all on the currently-active backend (see
    // BackendUnavailable.tsx) — a permanent 404, so retrying is pointless.
    retry: false,
  })
}

// GET /api/users/:id equivalent doesn't exist (confirmed live: /api/users/
// and /api/users/detail/ both 404 on the currently-active backend — the
// same dead-old-REST-namespace pattern already found for /api/orders/
// elsewhere in this app) — but userprofile/api/user.php?id=X is real: it's
// the JSON API behind the newer userprofile/index.php SPA page (found by
// watching that page's own network traffic while checking its Permissions
// tab — see userPermissions.queries.ts). It returns everything useUser and
// useUserDetail below need for one arbitrary user id, in one call, so both
// hooks share a single query instead of firing two separate requests for
// data that comes from the same real endpoint.
interface RawUserProfileWorkProfile {
  office_phone: string | null
  office_fax: string | null
  address: string | null
  zip: string | null
  town: string | null
  datelastlogin: string | null
  dateemployment: string | null
  dateemploymentend: string | null
  datestartvalidity: string | null
  dateendvalidity: string | null
  birth: string | null
  thm: number | null
  tjm: number | null
  weeklyhours: number | null
}

interface RawUserProfileUser {
  id: number
  login: string
  firstname: string
  lastname: string
  fullname: string
  email: string | null
  office_phone: string | null
  office_fax: string | null
  user_mobile: string | null
  personal_mobile: string | null
  job: string | null
  gender: string | null
  employee: number
  admin: number
  statut: number
  address: string | null
  zip: string | null
  town: string | null
  supervisor: string | number | null
  birth: string | null
  dateemployment: string | null
  dateemploymentend: string | null
  work_profile: RawUserProfileWorkProfile
}

interface RawUserProfileResponse {
  ok: boolean
  user: RawUserProfileUser
}

function useUserProfileQuery(id: string | number | undefined) {
  const numericId = typeof id === 'string' ? Number(id) : id
  return useQuery({
    queryKey: ['users', 'profile', numericId],
    queryFn: async (): Promise<RawUserProfileUser> => {
      const res = await fetch(`/userprofile/api/user.php?id=${numericId}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawUserProfileResponse = await res.json()
      if (!data.ok) throw new Error('Legacy backend rejected the request.')
      return data.user
    },
    enabled: numericId !== undefined && !Number.isNaN(numericId),
  })
}

export function useUser(id: string | number | undefined) {
  const { data, isLoading, isError, error } = useUserProfileQuery(id)
  const user: UserRow | undefined = data
    ? {
        id: data.id,
        login: data.login,
        name: data.fullname || `${data.firstname} ${data.lastname}`.trim(),
        employee: !!data.employee,
        phone: data.office_phone || data.user_mobile || data.personal_mobile || '',
        email: data.email ?? '',
        gender: data.gender ?? '',
        designation: data.job ?? '',
        lastLogin: data.work_profile.datelastlogin ? formatDateTimeAmPm(data.work_profile.datelastlogin) : '',
        status: data.statut === 1 ? 'Enabled' : 'Disabled',
        isAdmin: !!data.admin,
        // No distinct super-admin signal in this endpoint's response (that's
        // a multi-company/entity=0 concept this single-user API doesn't
        // expose) — false rather than a guess.
        isSuperAdmin: false,
      }
    : undefined
  return { user, isLoading, isError, error }
}

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

// countryLabel/stateLabel, createdAt/creatorLogin, and note aren't part of
// userprofile/api/user.php's response (that endpoint has country_id/
// state_id as bare numeric ids with no label, and creation metadata +
// notes live on separate userprofile/api/* endpoints this pass doesn't
// wire up) — null rather than a guess, same honesty convention as the rest
// of this file.
export function useUserDetail(id: string | number | undefined) {
  const { data, isLoading, isError, error } = useUserProfileQuery(id)
  const detail: UserDetailData | undefined = data
    ? {
        id: data.id,
        login: data.login,
        name: data.fullname || `${data.firstname} ${data.lastname}`.trim(),
        admin: !!data.admin,
        superAdmin: false,
        employee: !!data.employee,
        gender: data.gender,
        job: data.job,
        address: data.work_profile.address || data.address,
        zip: data.work_profile.zip || data.zip,
        town: data.work_profile.town || data.town,
        countryLabel: null,
        stateLabel: null,
        mobile: data.user_mobile || data.personal_mobile,
        officePhone: data.work_profile.office_phone || data.office_phone,
        officeFax: data.work_profile.office_fax || data.office_fax,
        email: data.email,
        enabled: data.statut === 1,
        lastLogin: data.work_profile.datelastlogin,
        createdAt: null,
        creatorLogin: null,
        note: null,
        dateEmployment: data.dateemployment || data.work_profile.dateemployment,
        dateEmploymentEnd: data.dateemploymentend || data.work_profile.dateemploymentend,
        dateStartValidity: data.work_profile.datestartvalidity,
        dateEndValidity: data.work_profile.dateendvalidity,
        birth: data.birth || data.work_profile.birth,
        supervisorName: data.supervisor !== null ? String(data.supervisor) : null,
        salary: null,
        hourlyCost: data.work_profile.thm,
        dailyCost: data.work_profile.tjm,
        weeklyHours: data.work_profile.weeklyhours,
      }
    : undefined
  return { detail, isLoading, isError, error }
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
