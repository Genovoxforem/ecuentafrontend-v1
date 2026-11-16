// The Expense module prints its dates as dd/mm/yyyy.
export const dmy = (iso: unknown) => {
  const [y, m, d] = String(iso ?? '').slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}
