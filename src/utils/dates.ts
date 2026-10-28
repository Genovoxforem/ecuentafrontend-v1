// Small date helpers shared by the screens.

/** Today as YYYY-MM-DD on the user's own clock (after midnight local time it is already the new day). */
export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The current month as YYYY-MM (local clock). */
export function currentMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** YYYY-MM-DD to MM/DD/YYYY, the way the classic pages print dates ('' when it is not a date). */
export const toUs = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

/** MM/DD/YYYY to YYYY-MM-DD ('' when it is not a date). */
export const toIso = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}

/** The date part of a YYYY-MM-DD or YYYY-MM-DD HH:MM:SS string as MM/DD/YYYY ('' when there is none). */
export function usDateFromIso(iso: string | null | undefined): string {
  const [y, m, d] = (iso ?? '').slice(0, 10).split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}
