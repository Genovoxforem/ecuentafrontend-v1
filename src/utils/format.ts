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

// ISO datetime -> "MM/DD/YYYY hh:mm AM/PM", matching the legacy app's "On :
// <date>" byline under a record's creator name (e.g. "04/30/2026 12:49 PM").
export function formatDateTimeAmPm(value: string | number | Date | null | undefined) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours24 = d.getHours()
  const hours12 = hours24 % 12 || 12
  const ampm = hours24 < 12 ? 'AM' : 'PM'
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(hours12)}:${pad(d.getMinutes())} ${ampm}`
}
