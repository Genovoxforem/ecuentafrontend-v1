import { api } from '../../api/axios'
import { resolveBackendAsset } from '../../api/backends'

export interface LoginCredentials {
  login: string
  password: string
  entity?: string
}

interface LoginSuccessData {
  bearer_token?: string
  api_key?: string
  token?: string
}

interface LoginResponse {
  success?: LoginSuccessData | false
  message?: string
}

export async function loginRequest({ login, password, entity }: LoginCredentials) {
  const body = new URLSearchParams()
  body.set('login', login)
  body.set('password', password)
  body.set('entity', entity || '1')

  const { data } = await api.post<LoginResponse>('/login/', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!data.success) {
    throw new Error(data.message ?? 'Login failed')
  }
  return data.success
}

// Raw shape as returned by GET /user/ — this PHP endpoint serializes
// numeric/flag DB columns (id, entity, admin) as strings, not JSON
// numbers/booleans, so `admin` needs explicit coercion below rather than a
// plain truthy check (the string "0" is truthy in JS).
interface RawUser {
  login: string
  firstname: string
  lastname: string
  admin: string | number | boolean
  email?: string
  job?: string
  photo?: string
}

interface MeResponse {
  success?: boolean
  message?: string
  user?: RawUser
  permissions?: Record<string, Record<string, boolean>>
}

export interface Me {
  user: { firstname: string; lastname: string; login: string; admin: boolean; email?: string; job?: string; photo?: string }
  permissions: Record<string, Record<string, boolean>>
}

export async function fetchMe(): Promise<Me> {
  const { data } = await api.get<MeResponse>('/user/')
  if (!data.success || !data.user) {
    throw new Error(data.message ?? 'Failed to fetch user')
  }
  return {
    user: {
      login: data.user.login,
      firstname: data.user.firstname,
      lastname: data.user.lastname,
      admin: data.user.admin === true || data.user.admin === 1 || data.user.admin === '1',
      email: data.user.email,
      job: data.user.job,
      // The API returns whichever the user actually has: their own uploaded
      // photo (needs the legacy PHP session cookie we don't carry, so it
      // 404s/redirects for us) or Dolibarr's public default-silhouette PNG
      // (a static asset, always reachable). Avatar falls back to initials
      // on load failure either way, so this is never a dead end.
      photo: resolveBackendAsset(data.user.photo),
    },
    permissions: data.permissions ?? {},
  }
}
