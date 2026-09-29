import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { readExchangeList, type ExchangeList } from './exchangeListParser'

// accountancy/bookkeeping/exchange_list.php — see exchangeListParser.ts. A read-only report.
const PATH = '/accountancy/bookkeeping/exchange_list.php'

export interface ExchangeFilters {
  currency: string
  // yyyy-mm-dd
  dateStart: string
  dateEnd: string
  account: string
}

export interface ExchangeRequest {
  filters: ExchangeFilters
  limit: number | null
  // 0-based
  page: number
}

const usDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}

// The page's own search parameters; the period travels as the single text it reads.
export function exchangeSearchParams(req: ExchangeRequest): URLSearchParams {
  const params = new URLSearchParams()
  const start = usDate(req.filters.dateStart)
  const end = usDate(req.filters.dateEnd)
  if (start && end) params.set('newdatepicker', `${start}-${end}`)
  if (req.filters.currency.trim()) params.set('search_currency_code', req.filters.currency.trim())
  if (req.filters.account) params.set('search_accountancy_code_end', req.filters.account)
  if (req.limit) params.set('limit', String(req.limit))
  if (req.page > 0) params.set('page', String(req.page))
  return params
}

export function useExchangeList(req: ExchangeRequest) {
  return useQuery({
    queryKey: ['generalLedger', 'exchangeList', req],
    queryFn: async (): Promise<ExchangeList> => readExchangeList(await fetchLegacyDocument(PATH, exchangeSearchParams(req))),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
