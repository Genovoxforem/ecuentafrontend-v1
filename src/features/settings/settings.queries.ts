import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'

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
}

function readAccountDetail(doc: Document, label: string): string {
  const labelElement = Array.from(doc.querySelectorAll('.row > .col-6.text-start > label.text-muted'))
    .find((element) => element.textContent?.trim().toLowerCase() === label.toLowerCase())
  const valueElement = labelElement?.parentElement?.nextElementSibling
  return valueElement?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

// /api/general/ currently omits the company tax and branch identifiers. The
// legacy page's account summary renders these same values for the signed-in
// entity, so read that summary only where the account panel needs them.
export function useCompanyAccountDetails() {
  return useQuery({
    queryKey: ['settings', 'companyAccountDetails'],
    queryFn: async (): Promise<CompanyAccountDetails> => {
      const doc = await fetchLegacyDocument('/admin/company.php')
      return {
        tpin: readAccountDetail(doc, 'TPIN'),
        branchCode: readAccountDetail(doc, 'Branch Code'),
        country: readAccountDetail(doc, 'Country'),
      }
    },
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
