import { useQuery } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// custom/hotel/app.php — a separate "Hotel Suite" single-page app with its
// own JSON API: custom/hotel/api.php?r=<resource> (GET) and ?a=<action>
// (POST, needs the page's per-session TOKEN).

export async function hotelGet<T>(resource: string): Promise<T> {
  const res = await fetch(`/custom/hotel/api.php?r=${resource}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const data = JSON.parse(text) as T & { error?: string }
  if (data && typeof data === 'object' && 'error' in data && data.error) throw new Error(String(data.error))
  return data
}

// The real per-session write token (confirmed stable across requests
// within one login session, embedded in app.php's own HTML as
// `TOKEN="..."`) — every a=<action> POST below requires it.
export function useHotelToken() {
  return useQuery({
    queryKey: ['hotel', 'token'],
    queryFn: async (): Promise<string> => {
      const res = await fetch('/custom/hotel/app.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const m = /TOKEN="([0-9a-f]+)"/.exec(html)
      if (!m) throw new Error('Could not read the Hotel Suite session token.')
      return m[1]
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export interface HotelApiOk {
  ok: true
  [key: string]: unknown
}
export interface HotelApiErr {
  ok?: false
  error?: string
}

export async function hotelPost(action: string, fields: Record<string, string | number | undefined>, token: string): Promise<HotelApiOk> {
  const fd = new FormData()
  fd.append('a', action)
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.append(k, String(v))
  }
  fd.append('token', token)
  const res = await fetch('/custom/hotel/api.php', { method: 'POST', credentials: 'same-origin', body: fd })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const data = JSON.parse(text) as HotelApiOk | HotelApiErr
  if (!data.ok) throw new Error(('error' in data && data.error) || 'The legacy backend rejected the request.')
  return data as HotelApiOk
}

// Same as hotelPost but sends a File (FormData.append(name, Blob) is a
// distinct overload hotelPost's string-only fields type can't express).
export async function hotelPostFile(action: string, fields: Record<string, string | number | undefined>, file: File, fileFieldName: string, token: string): Promise<HotelApiOk> {
  const fd = new FormData()
  fd.append('a', action)
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.append(k, String(v))
  }
  fd.append(fileFieldName, file)
  fd.append('token', token)
  const res = await fetch('/custom/hotel/api.php', { method: 'POST', credentials: 'same-origin', body: fd })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const data = JSON.parse(text) as HotelApiOk | HotelApiErr
  if (!data.ok) throw new Error(('error' in data && data.error) || 'The legacy backend rejected the request.')
  return data as HotelApiOk
}
