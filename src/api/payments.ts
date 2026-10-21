import { fapi } from './axios'
import type { Pagination } from './invoices'

export interface PaymentApiInvoice {
  id: number
  ref: string
  total_ttc: number
  amount_paid: number
  fk_statut: number
  paid: number
}

export interface PaymentApiRow {
  id: number
  ref: string
  date: string
  date_raw?: number
  amount: number
  status: number
  status_label: string
  num_payment: string
  type_code: string
  type_label: string
  bank_account: {
    id: number
    ref: string
    label: string
    number: string
    account_number: string
  } | null
  thirdparty: { id: number; name: string; email: string } | null
  invoices: PaymentApiInvoice[]
}

interface FapiSuccess<T> {
  success: boolean
  data: T
  message: string | null
  errors: unknown[]
}

interface FapiListResponse<T> extends FapiSuccess<{ items: T[]; pagination: Pagination }> {}

function unwrap<T>(response: FapiSuccess<T>): T {
  if (!response.success) {
    const errors = response.errors.map((error) => typeof error === 'string' ? error : JSON.stringify(error))
    throw new Error([response.message, ...errors].filter(Boolean).join(': ') || 'The payments API returned an unsuccessful response.')
  }
  return response.data
}

export interface PaymentListParams {
  page?: number
  limit?: number
  socid?: number
  userid?: number
  search_ref?: string
  search_company?: string
  search_payment_num?: string
  search_paymenttype?: string
  search_account?: string
  search_amount?: string
  date_start?: string
  date_end?: string
  year?: number
  month?: number
  sort?: 'ref' | 'date' | 'amount' | 'thirdparty' | 'bank'
  direction?: 'asc' | 'desc'
}

export async function fetchPayments(params: PaymentListParams = {}): Promise<{
  items: PaymentApiRow[]
  pagination: Pagination
}> {
  const res = await fapi.get<FapiListResponse<PaymentApiRow>>('/compta/paiement/fapi/list.php', { params })
  return unwrap(res.data)
}

export interface PaymentStatsData {
  currency: string
  summary: {
    count: number
    total_amount: number
    average_amount: number
    first_date: string | null
    last_date: string | null
  }
  by_month: Array<{ month: string; count: number; total: number }>
  by_type: Array<{ code: string; label: string; count: number; total: number }>
  by_bank_account: Array<{ id: number; ref: string; label: string; count: number; total: number }>
  top_customers: Array<{ id: number; name: string; count: number; total: number }>
}

// compta/facture/fapi/due_payments.php: customers owed, with ageing. Replaces
// custom/customersowed/view/customers_owed_report.php, which is a 404. `remaining`
// is computed in SQL and agrees with Facture::getRemainToPay() to the cent
// (verify=1 makes the server confirm that row by row).
export interface DuePaymentRow {
  invoice_id: number
  ref: string
  ref_client: string
  socid: number
  third_party_name: string
  type: number
  invoice_date: string
  due_date: string
  days_overdue: number
  aging_bucket: 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus'
  total_ttc: number
  paid: number
  credited: number
  remaining: number
  currency: string
}

export interface DuePaymentsData {
  as_of: string
  items: DuePaymentRow[]
  totals: { remaining: number; overdue_remaining: number; customers: number; invoices: number }
  aging: Record<DuePaymentRow['aging_bucket'], number>
}

export async function fetchDuePayments(params: { date?: string; socid?: number; overdue_only?: boolean } = {}): Promise<DuePaymentsData> {
  const res = await fapi.get<FapiSuccess<DuePaymentsData>>('/compta/facture/fapi/due_payments.php', {
    params: { ...params, overdue_only: params.overdue_only ? 1 : undefined },
  })
  return unwrap(res.data)
}

export async function fetchPaymentStats(params: Omit<PaymentListParams, 'page' | 'limit' | 'sort' | 'direction'>): Promise<PaymentStatsData> {
  const res = await fapi.get<FapiSuccess<PaymentStatsData>>('/compta/paiement/fapi/stats.php', { params })
  return unwrap(res.data)
}
