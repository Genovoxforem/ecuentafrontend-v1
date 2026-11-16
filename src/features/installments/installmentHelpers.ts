import { ROUTES } from '../../routes'
import { AssetApiError, errorText } from '../fixedAsset/assetService'

// Non-component helpers of the Installment Sales pages (kept apart from the components so React Fast Refresh keeps working).
export const planPath = (id: number | string) => ROUTES.installmentDetail.replace(':id', String(id))
export const payPath = (id: number | string, installment?: number | string) => `${ROUTES.installmentPay.replace(':id', String(id))}${installment ? `?installment=${installment}` : ''}`
export const receiptPath = (id: number | string) => ROUTES.installmentReceiptDetail.replace(':id', String(id))
// A payment that was reversed has no ref any more (live plan 22: payment 89, ref null, status reversed); the Payments tab shows "#89", the timeline printed "null".
export const paymentName = (x: { ref?: string | null; payment_id: number }) => x.ref || `#${x.payment_id}`
export const invoicePath = (id: number | string) => ROUTES.invoiceDetail.replace(':id', String(id))

export const STATUS_TONE: Record<string, 'neutral' | 'ok' | 'warn' | 'bad' | 'info'> = {
  draft: 'neutral',
  active: 'info',
  completed: 'ok',
  cancelled: 'bad',
  pending: 'neutral',
  partial: 'warn',
  paid: 'ok',
  overdue: 'bad',
  valid: 'ok',
  reversed: 'bad',
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  partial: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
  valid: 'Valid',
  reversed: 'Reversed',
}

export const CHART_COLORS = ['#3b5bdb', '#12805c', '#b45309', '#c92a2a', '#7048e8', '#0c8599', '#e8590c', '#5c940d']

// A refused request as one line: its message plus the first field errors the backend listed.
export function apiFailure(e: unknown, fallback = 'Request failed.'): string {
  if (e instanceof AssetApiError) {
    const extra = Object.values(e.errors).map(errorText).filter(Boolean).slice(0, 3)
    return extra.length ? `${e.message} — ${extra.join(' ')}` : e.message
  }
  return e instanceof Error ? e.message : fallback
}

// "2026-11" -> "Nov 2026"
export function monthLabel(m: string): string {
  const d = new Date(`${m}-01T00:00:00`)
  return Number.isNaN(d.getTime()) ? m : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
