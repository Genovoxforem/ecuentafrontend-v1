import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { readVatByCustomer } from './vatByCustomerParser'

// compta/tva/clients.php — see vatByCustomerParser.ts. A read-only report.
export interface VatByCustomerFilters {
  // yyyy-mm-dd; empty = the backend's own default (the previous quarter)
  dateStart: string
  dateEnd: string
  min: string
}

function dateParts(prefix: 'date_start' | 'date_end', iso: string): [string, string][] {
  const [y, m, d] = iso.split('-').map(Number)
  return y && m && d
    ? [
        [`${prefix}day`, String(d)],
        [`${prefix}month`, String(m)],
        [`${prefix}year`, String(y)],
      ]
    : []
}

export function vatByCustomerParams(f: VatByCustomerFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (f.dateStart && f.dateEnd) for (const [k, v] of [...dateParts('date_start', f.dateStart), ...dateParts('date_end', f.dateEnd)]) params.set(k, v)
  if (f.min.trim()) params.set('min', f.min.trim())
  return params
}

export function useVatByCustomer(filters: VatByCustomerFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'vatByCustomer', filters],
    queryFn: async () => readVatByCustomer(await fetchLegacyDocument('/compta/tva/clients.php', vatByCustomerParams(filters))),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
