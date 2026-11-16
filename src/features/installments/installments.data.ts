import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { installmentGet, installmentPost, type Params } from './installmentService'
import type {
  CustomerHit,
  DashboardData,
  InvoiceForPlan,
  OpenInvoice,
  PaymentList,
  PaymentOptions,
  PlanDetail,
  PlanList,
  PreviewResult,
  ProductHit,
  ReceiptData,
  ReportData,
  SettingsData,
  TemplateList,
} from './installmentModels'

// Every Installment Sales query lives under this key, so one call refreshes them all after a write (a payment changes the plan, the lists,
// the dashboard and every report at once).
export const INSTALLMENT_KEY = ['installments'] as const

export function invalidateInstallments(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: INSTALLMENT_KEY })
}

// ---- reads ---------------------------------------------------------------------------------------------------------------------------
export function useInstallmentTemplates() {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'templates'],
    queryFn: ({ signal }) => installmentGet<TemplateList>('plans.php', { action: 'templates' }, signal),
    staleTime: 1000 * 60,
  })
}

export function useInstallmentCustomers(q = '', enabled = true) {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'customers', q],
    queryFn: ({ signal }) => installmentGet<{ items: CustomerHit[] }>('plans.php', { action: 'customers', q }, signal),
    enabled,
    staleTime: 1000 * 60,
  })
}

export interface DashboardFilter {
  from: string
  to: string
  customer: string
  template: string
  currency: string
  status: string
}

export function useInstallmentDashboard(f: DashboardFilter) {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'dashboard', f],
    queryFn: ({ signal }) => installmentGet<DashboardData>('reports.php', { action: 'dashboard', ...f }, signal),
    placeholderData: keepPreviousData,
  })
}

export interface PlanQuery {
  q: string
  status: string
  due_from: string
  due_to: string
  from: string
  to: string
  currency: string
  template: string
  page: number
  limit: number
  sort: string
  dir: 'asc' | 'desc'
}

export function usePlanList(p: PlanQuery) {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'plans', p],
    queryFn: ({ signal }) => installmentGet<PlanList>('plans.php', { action: 'list', ...p }, signal),
    placeholderData: keepPreviousData,
  })
}

export function usePlanDetail(id: number) {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'plan', id],
    queryFn: ({ signal }) => installmentGet<PlanDetail>('plans.php', { action: 'get', id }, signal),
    enabled: id > 0,
  })
}

export function useOpenInvoices(q: string) {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'open-invoices', q],
    queryFn: ({ signal }) => installmentGet<{ items: OpenInvoice[] }>('plans.php', { action: 'invoices', q }, signal),
    placeholderData: keepPreviousData,
  })
}

export const fetchInvoiceForPlan = (id: number) => installmentGet<InvoiceForPlan>('plans.php', { action: 'invoice', id })
export const fetchProducts = (q: string) => installmentGet<{ items: ProductHit[] }>('plans.php', { action: 'products', q })

export function usePaymentOptions(planId?: number) {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'payment-options', planId ?? 0],
    queryFn: ({ signal }) => installmentGet<PaymentOptions>('payments.php', { action: 'options', plan_id: planId || undefined }, signal),
    staleTime: planId ? 0 : 1000 * 60,
  })
}

export interface PaymentQuery {
  q: string
  from: string
  to: string
  status: string
  mode: string
  page: number
  limit: number
}

export function usePaymentList(p: PaymentQuery) {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'payments', p],
    queryFn: ({ signal }) => installmentGet<PaymentList>('payments.php', { action: 'list', ...p }, signal),
    placeholderData: keepPreviousData,
  })
}

export function useReceipt(id: number) {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'receipt', id],
    queryFn: ({ signal }) => installmentGet<ReceiptData>('receipts.php', { action: 'get', id }, signal),
    enabled: id > 0,
  })
}

export function useInstallmentReport(report: string, params: Params, enabled: boolean) {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'report', report, params],
    queryFn: ({ signal }) => installmentGet<ReportData>('reports.php', { action: report, ...params }, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useInstallmentSettings() {
  return useQuery({
    queryKey: [...INSTALLMENT_KEY, 'settings'],
    queryFn: ({ signal }) => installmentGet<SettingsData>('settings.php', { action: 'get' }, signal),
  })
}

// ---- writes (JSON POST with the session token; every body is the one the classic page's script sends) --------------------
const post = <T>(file: string, body: Record<string, unknown>) => installmentPost<T>(file, body)

export function usePlanAction(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { action: 'validate' | 'cancel' | 'note'; body?: Record<string, unknown> }) => post<unknown>('plans.php', { action: v.action, id, ...(v.body ?? {}) }),
    onSuccess: () => invalidateInstallments(qc),
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => post<unknown>('plans.php', { action: 'delete', id }), onSuccess: () => invalidateInstallments(qc) })
}

export const previewPlan = (body: Record<string, unknown>) => post<PreviewResult>('plans.php', { action: 'preview', ...body }).then((r) => r.data)
export const applyInterest = (invoiceId: number, rate: number) => post<unknown>('plans.php', { action: 'apply_interest', invoice_id: invoiceId, rate })
export const savePlan = (body: Record<string, unknown>) => post<{ id: number }>('plans.php', { action: 'save', ...body })

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<{ receipt_id: number }>('payments.php', { action: 'record', ...body }),
    onSuccess: () => invalidateInstallments(qc),
  })
}

export function useReversePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { payment_id: number; reason: string }) => post<unknown>('payments.php', { action: 'reverse', ...v }),
    onSuccess: () => invalidateInstallments(qc),
  })
}

export const receiptPrinted = (id: number) => post<unknown>('receipts.php', { action: 'printed', id })
export const receiptEmailDraft = (id: number, to: string) => post<{ subject: string; message: string }>('receipts.php', { action: 'email', id, to })
export const receiptEmailSend = (id: number, body: Record<string, unknown>) => post<unknown>('receipts.php', { action: 'email', id, send: true, ...body })

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { group: string; values: Record<string, string> }) => post<{ accounting?: SettingsData['accounting'] }>('settings.php', { action: 'save', ...v }),
    onSuccess: () => invalidateInstallments(qc),
  })
}

export function useTemplateAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<{ templates: SettingsData['templates'] }>('settings.php', body),
    onSuccess: () => invalidateInstallments(qc),
  })
}
