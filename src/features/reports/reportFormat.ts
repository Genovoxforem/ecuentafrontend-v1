// Number and date formatting of the classic custom/reports pages, so the React screens print the same text as the page they replace.
// The classic pages read `parseFloat(n) || 0`: a null (SUM over no rows), an empty string or text counts as 0.

export type Numeric = number | string | null | undefined

export function num(v: Numeric): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

// 1,234.50: two decimals, thousands separated (the classic fmt()).
export function fmt(v: Numeric): string {
  return num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Whole numbers, thousands separated (the classic fmtInt()).
export function fmtInt(v: Numeric): string {
  return Math.trunc(num(v)).toLocaleString('en-US')
}

export function pct(v: Numeric): string {
  return num(v).toFixed(2) + '%'
}

// "2026-10-31 00:00:00" or "2026-10-31" -> "2026-10-31" (the classic fmtDate()).
export function fmtDate(s: string | null | undefined): string {
  return s ? String(s).substring(0, 10) : ''
}

const pad = (n: number) => String(n).padStart(2, '0')

// A local calendar date as YYYY-MM-DD (never through toISOString, which shifts the day in time zones east of UTC).
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Today as YYYY-MM-DD (the period the classic report pages open on).
export const today = () => isoDate(new Date())

export function monthStart(d = new Date()): string {
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function monthEnd(d = new Date()): string {
  return isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-11-01" -> "Nov 01, 2026" (the classic period label); anything else is returned as it is.
export function periodLabelDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[3]}, ${m[1]}` : iso
}

// "11/01/2026" -> "2026-11-01"; anything else is returned as it is.
export function isoFromUs(us: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(us)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : us
}

// "2026-11-01" -> "11/01/2026" (the date format of the classic filter boxes and of the customer report's datefilter).
export function usDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso
}
