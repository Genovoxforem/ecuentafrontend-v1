import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseVatByRate, parseVatRateDetail } from './vatReportByRateParser'

export interface VatRateFilters {
  period: string // "MM/dd/yyyy-MM/dd/yyyy"; empty = the backend's default (current month)
  invoiceType: string
  status: string
}

export function useVatByRate(filters: VatRateFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'vatByRate', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.period) params.set('newdatepicker', filters.period)
      if (filters.invoiceType) params.set('invoice_type', filters.invoiceType)
      if (filters.status) params.set('status_val', filters.status)
      return parseVatByRate(await fetchLegacyDocument('/compta/tva/quadri_detail.php', params))
    },
  })
}

// The row's "+" panel — same request the original page's own script makes.
export function useVatRateDetail(detailId: string | null, filters: { period: string; invoiceType: string; status: string }) {
  return useQuery({
    queryKey: ['generalLedger', 'vatByRateDetail', detailId, filters],
    enabled: detailId !== null,
    queryFn: async () => {
      const params = new URLSearchParams({
        invoiceno: detailId ?? '',
        invoicedate: filters.period,
        status_val: filters.status === 'All' ? '' : filters.status,
        invoice_type: filters.invoiceType,
      })
      return parseVatRateDetail(await fetchLegacyDocument('/compta/tva/tvadetailsajax.php', params))
    },
  })
}
