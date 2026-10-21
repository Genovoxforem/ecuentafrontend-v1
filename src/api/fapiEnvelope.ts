import axios from 'axios'
import { fapi } from './axios'
import { isMissingRoute, requireJson } from '../features/salesOrders/orderApi'

// The {success, data, message, errors} envelope every module fapi answers with. These helpers
// unwrap it, turn a JSON error into an Error carrying the server's own message (and the first field
// error when there is one) and let a missing route (an HTML 404) through unchanged, so callers can
// use preferNewApi() to fall back to the older endpoint.
export interface FapiEnvelope<T> {
  success: boolean
  data: T
  message: string | null
  errors: unknown
}

function errorText(body: { message?: unknown; errors?: unknown } | undefined, fallback: string): string {
  const parts: string[] = []
  if (typeof body?.message === 'string' && body.message) parts.push(body.message)
  const errors = body?.errors
  if (errors && typeof errors === 'object') {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      const first = Array.isArray(value) ? value[0] : value
      if (typeof first === 'string' && first && !parts.includes(first)) parts.push(first)
    }
  }
  return parts.join(' — ') || fallback
}

function rethrow(e: unknown): never {
  if (isMissingRoute(e)) throw e
  if (axios.isAxiosError(e)) throw new Error(errorText(e.response?.data, `Backend returned ${e.response?.status ?? 'no response'}.`))
  throw e
}

export async function fapiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  try {
    const res = requireJson(await fapi.get<FapiEnvelope<T>>(path, { params }))
    if (res.data.success === false) throw new Error(errorText(res.data, 'Request failed.'))
    return res.data.data
  } catch (e) {
    return rethrow(e)
  }
}

export async function fapiPost<T>(path: string, payload: unknown, params?: Record<string, string | number | undefined>): Promise<T> {
  try {
    const res = requireJson(await fapi.post<FapiEnvelope<T>>(path, payload, { params }))
    if (res.data.success === false) throw new Error(errorText(res.data, 'Request failed.'))
    return res.data.data
  } catch (e) {
    return rethrow(e)
  }
}
