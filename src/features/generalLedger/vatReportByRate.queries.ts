import { useQuery } from '@tanstack/react-query'
import { loadVatByRate, loadVatRateDetail } from './vatReportsFapi'

export interface VatRateFilters {
  period: string // "MM/dd/yyyy-MM/dd/yyyy"; empty = the backend's default period
  invoiceType: string
  status: string
}

// compta/tva/fapi/report_by_rate.php
export function useVatByRate(filters: VatRateFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'vatByRate', 'fapi', filters],
    queryFn: () => loadVatByRate(filters),
  })
}

// The row's "+" panel: the same endpoint with detail=1 for that rate.
export function useVatRateDetail(detailId: string | null, filters: VatRateFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'vatByRateDetail', 'fapi', detailId, filters],
    enabled: detailId !== null,
    queryFn: () => loadVatRateDetail(detailId ?? '', filters),
  })
}
