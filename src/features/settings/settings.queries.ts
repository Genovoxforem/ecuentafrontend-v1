import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

interface GeneralSettings {
  app_name: string
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
