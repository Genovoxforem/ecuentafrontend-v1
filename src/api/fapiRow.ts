/* eslint-disable @typescript-eslint/no-explicit-any */
// Small readers for fapi list rows. The backend returns dates as Unix seconds or ISO strings depending on the
// column, and the same fact can sit flat (`customer_name`) or nested (`customer.name`); these try the likely
// spellings in order so one mapper survives both, and a miss shows an empty cell rather than throwing.

function at(o: any, path: string): unknown {
  return path.split('.').reduce((v: any, k) => (v == null ? undefined : v[k]), o)
}

export function pickStr(o: any, ...paths: string[]): string {
  for (const p of paths) {
    const v = at(o, p)
    if (v !== undefined && v !== null && v !== '') return String(v)
  }
  return ''
}

export function pickNum(o: any, ...paths: string[]): number {
  for (const p of paths) {
    const v = at(o, p)
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) return Number(v)
  }
  return 0
}

export function pickNumOrNull(o: any, ...paths: string[]): number | null {
  for (const p of paths) {
    const v = at(o, p)
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v))) return Number(v)
  }
  return null
}

export function pickBool(o: any, ...paths: string[]): boolean {
  for (const p of paths) {
    const v = at(o, p)
    if (v !== undefined && v !== null && v !== '') return v === true || v === 1 || v === '1' || v === 'true'
  }
  return false
}

/** Unix seconds, an ISO date(time) or an empty value -> a Date, or null. */
export function toDate(v: unknown): Date | null {
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'number' || /^\d{9,11}$/.test(String(v))) return new Date(Number(v) * 1000)
  const d = new Date(String(v).replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

/** MM/DD/YYYY, the way the classic lists printed a date. */
export function usDate(v: unknown): string {
  const d = toDate(v)
  if (!d) return ''
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
}

/** YYYY-MM-DD. */
export function isoDate(v: unknown): string {
  const d = toDate(v)
  return d ? d.toISOString().slice(0, 10) : ''
}

/** Reads every page of a `{items, pagination:{pages}}` list (a hard cap of 50 pages guards a runaway). */
export async function fetchAllPages<T = any>(get: (page: number) => Promise<{ items?: T[]; pagination?: { pages?: number } }>): Promise<T[]> {
  const out: T[] = []
  let pages = 1
  for (let page = 1; page <= pages && page <= 50; page += 1) {
    const d = await get(page)
    pages = d.pagination?.pages ?? 1
    out.push(...(d.items ?? []))
  }
  return out
}
