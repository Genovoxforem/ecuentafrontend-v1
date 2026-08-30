import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { formatDateTimeAmPm } from '../../utils/format'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'
import { fetchSocieteFormContext } from '../customers/thirdPartyOptions.queries'

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

// Raw shape as returned by userprofile/api/users.php?action=list (real,
// confirmed by reading that file directly). mode=all (not 'employee',
// despite the reference page's own URL saying mode=employee — that param
// belongs to the classic Dolibarr user/list.php page and isn't forwarded
// to this API; confirmed live: mode=employee here filters to 16 rows,
// mode=all returns the real 20 matching the "Total Users" stat card and
// the reference screenshot's own mixed Employee Yes/No rows). admin/
// employee/statut come back as real ints (0/1), not booleans — coerced
// below.
interface RawUserItem {
  id: number
  login: string
  name: string
  admin: number
  employee: number
  entity: number
  gender: string | null
  phone: string | null
  email: string | null
  designation: string | null
  lastlogin: string
  status: 'Enabled' | 'Disabled'
}

const QUERY_KEY = ['users', 'summary'] as const

function toRow(item: RawUserItem): UserRow {
  return {
    id: item.id,
    login: item.login,
    name: item.name ?? '',
    employee: !!item.employee,
    phone: item.phone ?? '',
    email: item.email ?? '',
    gender: item.gender ?? '',
    designation: item.designation ?? '',
    lastLogin: item.lastlogin ? formatDateTimeAmPm(item.lastlogin) : '',
    status: item.status,
    isAdmin: !!item.admin,
    // Matches the real stats action's own definition (admin=1 AND
    // entity=0) — confirmed by reading that action directly, not guessed.
    isSuperAdmin: !!item.admin && item.entity === 0,
  }
}

// userprofile/api/users.php?action=stats (stat-card counts) + ?action=list
// (the row list, limit: 500 — this endpoint's own clamp ceiling) — real,
// confirmed by reading that file directly. The old GET /api/users/summary/
// and /api/users/ this used to call are both permanent 404s on the active
// backend (confirmed live) — a completely different, dead REST namespace
// from the real userprofile/api/* one already used elsewhere in this file
// for single-user detail and the New User wizard.
export function useUsersSummary() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<UsersSummary> => {
      const [statsRes, listRes] = await Promise.all([
        fetch('/userprofile/api/users.php?action=stats', { credentials: 'same-origin' }),
        fetch('/userprofile/api/users.php?action=list&mode=all&limit=500', { credentials: 'same-origin' }),
      ])
      if (!statsRes.ok || !listRes.ok) throw new Error(`Legacy backend returned ${statsRes.status}/${listRes.status}.`)
      const statsData: { ok: boolean; stats: { total_users: number; admins: number; superadmins: number; active_users: number; today_login_users: number } } = await statsRes.json()
      const listData: { ok: boolean; rows: RawUserItem[] } = await listRes.json()
      if (!statsData.ok || !listData.ok) throw new Error('Legacy backend rejected the request.')
      return {
        totalUsers: statsData.stats.total_users,
        admins: statsData.stats.admins,
        superAdmins: statsData.stats.superadmins,
        activeUsers: statsData.stats.active_users,
        todayLoginUsers: statsData.stats.today_login_users,
        users: listData.rows.map(toRow),
      }
    },
    staleTime: 1000 * 60,
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
  country_id: number
  state_id: number
  datelastlogin: string | null
  datepreviouslogin: string | null
  dateemployment: string | null
  dateemploymentend: string | null
  datestartvalidity: string | null
  dateendvalidity: string | null
  birth: string | null
  thm: number | null
  tjm: number | null
  weeklyhours: number | null
  accountancy_code: string | null
  color: string | null
  default_lang: string | null
}

// {id, name, login} — every "who" field on this endpoint (supervisor,
// expense/holiday validators) is resolved server-side by the shared
// up_api_user_brief() helper, never a bare id/name string. Treating any of
// these as a primitive (as the old code did for `supervisor`, via
// `String(data.supervisor)`) produces the literal text "[object Object]".
interface RawUserBrief {
  id: number
  name: string
  login: string
}

interface RawUserSocialLink {
  key: string
  label: string
  value: string
  url: string
}

interface RawUserDevice {
  id: number
  name: string
  brand: string
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
  socid: number
  address: string | null
  zip: string | null
  town: string | null
  signature: string | null
  photo: string | null
  photo_name: string | null
  groups: string[]
  group_ids: number[]
  nb_rights: number
  contact_phone: string
  device: string | null
  device_uid: string | null
  timesheet_device: RawUserDevice | null
  supervisor: RawUserBrief | null
  expense_validator: RawUserBrief | null
  holiday_validator: RawUserBrief | null
  employee_nrc: string | null
  birth: string | null
  dateemployment: string | null
  dateemploymentend: string | null
  social_links: RawUserSocialLink[]
  work_profile: RawUserProfileWorkProfile
}

interface RawUserProfileGroup {
  id: number
  name: string
}

interface RawUserProfileResponse {
  ok: boolean
  can_edit: boolean
  actions: {
    can_email: boolean
    can_whatsapp: boolean
    can_disable: boolean
    can_enable: boolean
    can_delete: boolean
    is_self: boolean
  }
  urls: {
    email: string
    whatsapp: string
    classic_card: string
    linked_objects: string
  }
  modules: {
    expensereport: boolean
    holiday: boolean
  }
  user: RawUserProfileUser
  all_groups: RawUserProfileGroup[]
}

function useUserProfileQuery(id: string | number | undefined) {
  const numericId = typeof id === 'string' ? Number(id) : id
  return useQuery({
    queryKey: ['users', 'profile', numericId],
    queryFn: async (): Promise<RawUserProfileResponse> => {
      const res = await fetch(`/userprofile/api/user.php?id=${numericId}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawUserProfileResponse = await res.json()
      if (!data.ok) throw new Error('Legacy backend rejected the request.')
      return data
    },
    enabled: numericId !== undefined && !Number.isNaN(numericId),
  })
}

export function useUser(id: string | number | undefined) {
  const { data: envelope, isLoading, isError, error } = useUserProfileQuery(id)
  const data = envelope?.user
  const user: UserRow | undefined = data
    ? {
        id: data.id,
        login: data.login,
        name: data.fullname || `${data.firstname} ${data.lastname}`.trim(),
        employee: !!data.employee,
        phone: data.contact_phone || data.office_phone || data.user_mobile || data.personal_mobile || '',
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

export interface UserBriefRef {
  id: number
  name: string
  login: string
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
  supervisor: UserBriefRef | null
  expenseValidator: UserBriefRef | null
  holidayValidator: UserBriefRef | null
  employeeNrc: string | null
  salary: number | null
  hourlyCost: number | null
  dailyCost: number | null
  weeklyHours: number | null
  photo: string | null
  groups: string[]
  groupIds: number[]
  nbRights: number
  socialLinks: Array<{ key: string; label: string; value: string; url: string }>
  timesheetDevice: { id: number; name: string; brand: string } | null
  canEdit: boolean
  actions: {
    canEmail: boolean
    canWhatsapp: boolean
    canDisable: boolean
    canEnable: boolean
    canDelete: boolean
    isSelf: boolean
  }
  urls: {
    email: string
    whatsapp: string
    classicCard: string
    linkedObjects: string
  }
  modules: {
    expensereport: boolean
    holiday: boolean
  }
  allGroups: Array<{ id: number; name: string }>
}

function toBrief(brief: RawUserBrief | null): UserBriefRef | null {
  return brief ? { id: brief.id, name: brief.name, login: brief.login } : null
}

// countryLabel/stateLabel, createdAt/creatorLogin, and note aren't part of
// userprofile/api/user.php's response (that endpoint has country_id/
// state_id as bare numeric ids with no label, and creation metadata +
// notes live on separate userprofile/api/* endpoints — notes now covered by
// useUserNotes() in userDetailTabs.queries.ts) — null rather than a guess,
// same honesty convention as the rest of this file.
export function useUserDetail(id: string | number | undefined) {
  const { data: envelope, isLoading, isError, error } = useUserProfileQuery(id)
  const data = envelope?.user
  const detail: UserDetailData | undefined =
    data && envelope
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
          supervisor: toBrief(data.supervisor),
          expenseValidator: toBrief(data.expense_validator),
          holidayValidator: toBrief(data.holiday_validator),
          employeeNrc: data.employee_nrc,
          salary: null,
          hourlyCost: data.work_profile.thm,
          dailyCost: data.work_profile.tjm,
          weeklyHours: data.work_profile.weeklyhours,
          photo: data.photo,
          groups: data.groups,
          groupIds: data.group_ids,
          nbRights: data.nb_rights,
          socialLinks: data.social_links,
          timesheetDevice: data.timesheet_device,
          canEdit: envelope.can_edit,
          actions: {
            canEmail: envelope.actions.can_email,
            canWhatsapp: envelope.actions.can_whatsapp,
            canDisable: envelope.actions.can_disable,
            canEnable: envelope.actions.can_enable,
            canDelete: envelope.actions.can_delete,
            isSelf: envelope.actions.is_self,
          },
          urls: {
            email: envelope.urls.email,
            whatsapp: envelope.urls.whatsapp,
            classicCard: envelope.urls.classic_card,
            linkedObjects: envelope.urls.linked_objects,
          },
          modules: envelope.modules,
          allGroups: envelope.all_groups,
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

// GET userprofile/api/users.php?action=wizard_options — real, confirmed by
// reading that file directly: this is the exact data source behind the
// real "New user" wizard (designations, devices, supervisors, civilities,
// countries, languages, social network keys, and the real POS/admin token
// quota counts shown as "Used: X / Total: Y" on the real page). Session-
// cookie authenticated like userprofile/api/user.php elsewhere in this file.
export interface UserWizardOptions {
  canCreate: boolean
  designations: string[]
  devices: Array<{ id: number; name: string; brand: string | null }>
  civilities: Array<{ id: string; name: string }>
  countries: Array<{ id: number; name: string; code: string }>
  socialNetworks: Array<{ key: string; label: string }>
  tokens: { activeUsed: number; activeTotal: number; posUsed: number; posTotal: number }
}
interface RawWizardOptions {
  ok: boolean
  can_create: boolean
  designations: string[]
  devices: Array<{ id: number; device_name?: string; name?: string; brand: string | null }>
  civilities: Array<{ id: string; name: string }>
  countries: Array<{ id: number; name: string; code: string }>
  social_networks: Array<{ key: string; label: string }>
  tokens: { active_used: number; active_total: number; pos_used: number; pos_total: number }
}
export function useUserWizardOptions() {
  return useQuery({
    queryKey: ['users', 'wizard-options'],
    queryFn: async (): Promise<UserWizardOptions> => {
      const res = await fetch('/userprofile/api/users.php?action=wizard_options', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawWizardOptions = await res.json()
      if (!data.ok) throw new Error('Legacy backend rejected the request.')
      return {
        canCreate: data.can_create,
        designations: data.designations ?? [],
        devices: (data.devices ?? []).map((d) => ({ id: d.id, name: d.device_name ?? d.name ?? '', brand: d.brand })),
        civilities: data.civilities ?? [],
        countries: data.countries ?? [],
        socialNetworks: data.social_networks ?? [],
        tokens: {
          activeUsed: data.tokens?.active_used ?? 0,
          activeTotal: data.tokens?.active_total ?? 0,
          posUsed: data.tokens?.pos_used ?? 0,
          posTotal: data.tokens?.pos_total ?? 0,
        },
      }
    },
    staleTime: 1000 * 60,
  })
}

// GET userprofile/api/users.php?action=states&country_id=X — real, confirmed
// by reading that file directly (up_users_fetch_states, llx_c_departements
// joined to llx_c_regions).
export interface StateOption {
  id: number
  name: string
  code: string
}
export function useUserStateOptions(countryId: number | undefined) {
  return useQuery({
    queryKey: ['users', 'states', countryId ?? 0],
    queryFn: async (): Promise<StateOption[]> => {
      const res = await fetch(`/userprofile/api/users.php?action=states&country_id=${countryId}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: { ok: boolean; states: StateOption[] } = await res.json()
      return data.ok ? (data.states ?? []) : []
    },
    enabled: !!countryId,
    staleTime: 1000 * 60,
  })
}

export interface NewUserInput {
  firstname: string
  lastname: string
  email: string
  civilityCode?: string
  gender?: 'man' | 'woman' | ''
  userMobile?: string
  officePhone?: string
  employee: boolean
  isAdmin: boolean
  job: string
  deviceId?: number
  uid?: string
  address?: string
  zip?: string
  town?: string
  countryId?: number
  stateId?: number
  supervisorId?: number
  expenseValidatorId?: number
  isPosUser?: boolean
  isKotUser?: boolean
  apiKey?: string
  color?: string
  defaultLang?: string
  note?: string
  signature?: string
  dateEmployment?: string
  dateEmploymentEnd?: string
  dateStartValidity?: string
  dateEndValidity?: string
  birth?: string
  social?: Record<string, string>
}

interface CreateUserResponse {
  ok: boolean
  error?: string
  id?: number
  login?: string
  password?: string
}

// POST userprofile/api/users.php?action=create — real, confirmed by reading
// that file directly: a genuine Dolibarr User::create() call backing the
// real 3-step "New user" wizard shown in the reference screenshots (basic/
// professional/social payload shape, same field names). Reuses the same
// session-wide Dolibarr CSRF token fetchSocieteFormContext() already
// scrapes for societe/api/* — confirmed this endpoint checks the identical
// currentToken()/newToken() pair, not a page-specific token.
export function useCreateUserReal() {
  const queryClient = useQueryClient()
  const logActivity = useLogActivity()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: NewUserInput) => {
      const { token } = await fetchSocieteFormContext()
      const body = {
        token,
        basic: {
          firstname: input.firstname,
          lastname: input.lastname,
          email: input.email,
          civility_code: input.civilityCode ?? '',
          gender: input.gender ?? '',
          user_mobile: input.userMobile ?? '',
          office_phone: input.officePhone ?? '',
          employee: input.employee ? 1 : 0,
          admin: input.isAdmin ? 1 : 0,
          is_pos_user: !!input.isPosUser,
          is_kot_user: !!input.isKotUser,
          device: input.deviceId ?? 0,
          uid: input.uid ?? '',
          address: input.address ?? '',
          zip: input.zip ?? '',
          town: input.town ?? '',
          country_id: input.countryId ?? 0,
          state_id: input.stateId ?? 0,
          fk_user: input.supervisorId ?? 0,
          fk_user_expense_validator: input.expenseValidatorId ?? 0,
          api_key: input.apiKey ?? '',
        },
        professional: {
          job: input.job,
          color: input.color ?? '',
          default_lang: input.defaultLang ?? '',
          note: input.note ?? '',
          signature: input.signature ?? '',
          dateemployment: input.dateEmployment ?? '',
          dateemploymentend: input.dateEmploymentEnd ?? '',
          datestartvalidity: input.dateStartValidity ?? '',
          dateendvalidity: input.dateEndValidity ?? '',
          birth: input.birth ?? '',
        },
        social: input.social ?? {},
      }
      const res = await fetch('/userprofile/api/users.php?action=create', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: CreateUserResponse = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to create user')
      return data
    },
    onSuccess: (data, input) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `New user ${input.firstname} ${input.lastname} (${data.login}) added`, category: 'other', authorName })
    },
  })
}
