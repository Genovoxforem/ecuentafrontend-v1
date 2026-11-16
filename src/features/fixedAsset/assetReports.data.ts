import { useQuery } from '@tanstack/react-query'
import { assetGet } from './assetService'
import type { ForecastReport, InsuranceReport, ReconcileReport, RegisterReport, RollForwardReport } from './assetModels'
import { ASSET_KEY } from './assetList.data'

// asset/api/reports.php?action=register|rollforward|forecast|insurance|reconcile. Each report page is its own query, so only the open tab
// is read. Parameters (checked on newecuenta): register as_of, rollforward from + to, forecast months, insurance days.
export const useRegisterReport = (asOf: string) =>
  useQuery({ queryKey: [...ASSET_KEY, 'report', 'register', asOf], queryFn: ({ signal }) => assetGet<RegisterReport>('reports.php', { action: 'register', as_of: asOf }, signal), enabled: !!asOf })

export const useRollForwardReport = (from: string, to: string) =>
  useQuery({ queryKey: [...ASSET_KEY, 'report', 'rollforward', from, to], queryFn: ({ signal }) => assetGet<RollForwardReport>('reports.php', { action: 'rollforward', from, to }, signal), enabled: !!from && !!to })

export const useForecastReport = (months: number) =>
  useQuery({ queryKey: [...ASSET_KEY, 'report', 'forecast', months], queryFn: ({ signal }) => assetGet<ForecastReport>('reports.php', { action: 'forecast', months }, signal), enabled: months > 0 })

export const useInsuranceReport = (days: number) =>
  useQuery({ queryKey: [...ASSET_KEY, 'report', 'insurance', days], queryFn: ({ signal }) => assetGet<InsuranceReport>('reports.php', { action: 'insurance', days }, signal), enabled: days >= 0 })

export const useReconcileReport = () =>
  useQuery({ queryKey: [...ASSET_KEY, 'report', 'reconcile'], queryFn: ({ signal }) => assetGet<ReconcileReport>('reports.php', { action: 'reconcile' }, signal) })
