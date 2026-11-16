import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { fapiGet } from '../../api/fapiEnvelope'

interface GeneralSettings {
  app_name: string
  company_logo?: string
  tpin: string
  branch_code: string
  // Raw "id:code:label" const value (e.g. "239:ZM:Zambia") — parse with a
  // display helper rather than splitting inline at each call site.
  country: string
  currency: string
  timezone: string
  // The entity the current token is scoped to — baked in at login (see
  // auth_helper.php's authenticate_jwt()), not switchable server-side
  // without a fresh login. Used to show which entity is currently active.
  entity: number
}

interface GeneralSettingsResponse {
  success: boolean
  settings: GeneralSettings
}

// GET /api/general/ — company/currency/entity settings, shared by every
// backend this app talks to (see src/api/backends.ts).
export function useGeneralSettings() {
  return useQuery({
    queryKey: ['settings', 'general'],
    queryFn: async () => {
      const { data } = await api.get<GeneralSettingsResponse>('/general/')
      return data.settings
    },
    staleTime: 1000 * 60 * 10,
  })
}

export interface CompanyAccountDetails {
  tpin: string
  branchCode: string
  country: string
  // The company time zone (core/fapi/company.php timezone = MAIN_SERVER_TZ). /api/general/ always answers "UTC" (BUG-69).
  timezone: string
}

// core/fapi/company.php carries the company's TPIN, branch code and country (key-authenticated JSON); /api/general/ omits
// them, and the company time zone. The classic account summary (admin/company.php) is no longer read.
async function fetchCompanyAccountDetails(): Promise<CompanyAccountDetails> {
  const d = await fapiGet<{ tpin?: string; branch_code?: string; country?: { name?: string } | null; timezone?: string }>('/core/fapi/company.php')
  return { tpin: d.tpin ?? '', branchCode: d.branch_code ?? '', country: d.country?.name ?? '', timezone: d.timezone ?? '' }
}

export function useCompanyAccountDetails() {
  return useQuery({
    queryKey: ['settings', 'companyAccountDetails'],
    queryFn: fetchCompanyAccountDetails,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
}

export interface EntityOption {
  id: number
  label: string
}

interface EntitiesResponse {
  entities: EntityOption[]
}

// GET /api/entities/ — public, no auth required. Its own PHP source is
// explicitly commented "Used by React login page to show entity names
// instead of IDs", so this is the intended source for any entity picker.
export function useEntities() {
  return useQuery({
    queryKey: ['settings', 'entities'],
    queryFn: async () => {
      const { data } = await api.get<EntitiesResponse>('/entities/')
      return data.entities
    },
    staleTime: 1000 * 60 * 10,
  })
}
