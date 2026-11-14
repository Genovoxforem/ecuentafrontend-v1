const moneyFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const numberFormatter = new Intl.NumberFormat('en-US')

// Fixed 2-decimal amount, e.g. 1234.5 -> "1,234.50". Compose the currency
// label around this yourself — screens show it differently (prefixed,
// suffixed, or in its own column), so the symbol isn't baked in here.
export function formatMoney(value: number | string | null | undefined) {
  return moneyFormatter.format(Number(value ?? 0))
}

// Plain comma-grouped count/quantity, no forced decimals, e.g. 12345 -> "12,345".
export function formatNumber(value: number | string | null | undefined) {
  return numberFormatter.format(Number(value ?? 0))
}

// ISO date/datetime -> "YYYY-MM-DD", the format used across list/report tables.
export function formatDate(value: string | number | Date | null | undefined) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString().slice(0, 10)
}

// ISO datetime -> "YYYY-MM-DD HH:MM", for columns where the time-of-day
// actually matters (unlike formatDate, which intentionally drops it).
export function formatDateTime(value: string | number | Date | null | undefined) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// "2026-11-10T13:01:39+00:00" -> "11/10/2026 01:01 PM": the date and time exactly as the server wrote them, not converted to the browser's time
// zone (the classic cards print the server's time; converting moved 13:01 to 18:31 on a browser set to India time).
export function formatServerDateTime(value: string | null | undefined) {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value)
  if (!m) return formatDateTimeAmPm(value)
  const hours24 = Number(m[4])
  return `${m[2]}/${m[3]}/${m[1]} ${String(hours24 % 12 || 12).padStart(2, '0')}:${m[5]} ${hours24 < 12 ? 'AM' : 'PM'}`
}

// ISO datetime -> "MM/DD/YYYY hh:mm AM/PM", matching the legacy app's "On :
// <date>" byline under a record's creator name (e.g. "04/30/2026 12:49 PM").
export function formatDateTimeAmPm(value: string | number | Date | null | undefined) {
  if (!value) return ''
  // A bare date ("2026-10-31", e.g. user last login) has no time: print the date as it is instead of inventing a time from the browser's time zone (05:30 AM on India time).
  const bare = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  if (bare) return `${bare[2]}/${bare[3]}/${bare[1]}`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours24 = d.getHours()
  const hours12 = hours24 % 12 || 12
  const ampm = hours24 < 12 ? 'AM' : 'PM'
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(hours12)}:${pad(d.getMinutes())} ${ampm}`
}
