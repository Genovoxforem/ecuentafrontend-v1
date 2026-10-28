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
      const list = Array.isArray(value) ? value : [value]
      // A refused line comes as {index, message}: name the line so the user knows which one to fix.
      const texts = list.map((e) => {
        if (typeof e === 'string') return e
        const line = e as { index?: unknown; message?: unknown } | null
        return typeof line?.message === 'string' ? (typeof line.index === 'number' ? `Line ${line.index + 1}: ${line.message}` : line.message) : ''
      })
      const shown = texts.every((t) => t === '' || t.startsWith('Line ')) ? texts : texts.slice(0, 1)
      for (const t of shown) if (t && !parts.includes(t)) parts.push(t)
    }
  }
  return parts.join(' — ') || fallback
}

function rethrow(e: unknown): never {
  if (axios.isCancel(e) || isMissingRoute(e)) throw e
  // httpStatus keeps the answer's status so the query client does not retry a 4xx (queryClient.ts isPermanentHttpError).
  if (axios.isAxiosError(e)) throw Object.assign(new Error(errorText(e.response?.data, `Backend returned ${e.response?.status ?? 'no response'}.`)), { httpStatus: e.response?.status })
  throw e
}

// `signal` is React Query's query signal: pass it so a query that is no longer wanted cancels its request.
export async function fapiGet<T>(path: string, params?: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<T> {
  try {
    const res = requireJson(await fapi.get<FapiEnvelope<T>>(path, { params, signal }))
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
