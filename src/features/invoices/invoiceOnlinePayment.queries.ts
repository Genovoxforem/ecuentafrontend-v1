/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

const PATH = '/compta/facture/fapi/online_payment.php'

export interface OnlinePaymentAttempt {
  reference: string
  amount: number
  currency: string
  state: string
  status: string
  created: string
}

export interface OnlinePaymentInfo {
  gatewayName: string
  sandbox: boolean
  sandboxWarning: string
  ready: boolean
  missing: string[]
  note: string
  payable: boolean
  blockedBy: string[]
  invoiceRef: string
  remaining: number
  currency: string
  checkoutUrl: string
  attempts: OnlinePaymentAttempt[]
}

export interface OnlinePaymentStatus {
  reference: string
  state: string
  status: string
  amount: number
  currency: string
  paid: boolean
  checkoutUrl: string
}

// GET online_payment.php?invoice=: the gateway, what is still owed, whether the invoice can be paid and why
// not, and every attempt so far.
export function useOnlinePaymentInfo(invoiceId: string | number | undefined, enabled = true) {
  return useQuery<OnlinePaymentInfo>({
    queryKey: ['invoices', 'online-payment', String(invoiceId)],
    enabled: !!invoiceId && enabled,
    queryFn: async () => {
      const d = await fapiGet<any>(PATH, { invoice: invoiceId })
      return {
        gatewayName: d.gateway?.name ?? '',
        sandbox: Boolean(d.gateway?.sandbox),
        sandboxWarning: d.gateway?.sandbox_warning ?? '',
        ready: Boolean(d.gateway?.ready),
        missing: d.gateway?.missing ?? [],
        note: d.gateway?.note ?? '',
        payable: Boolean(d.payable),
        blockedBy: (d.payable_blocked_by ?? []).map(String),
        invoiceRef: d.invoice?.ref ?? '',
        remaining: Number(d.invoice?.remaining) || 0,
        currency: d.invoice?.currency ?? '',
        checkoutUrl: d.checkout?.url ?? '',
        attempts: (d.attempts ?? []).map((a: any) => ({ reference: a.reference, amount: Number(a.amount) || 0, currency: a.currency ?? '', state: a.state ?? '', status: a.status ?? '', created: a.created ?? '' })),
      }
    },
  })
}

// POST ?action=start records an attempt (422 above the balance, 409 on a draft) and answers where to pay.
export function useStartOnlinePayment(invoiceId: string | number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (amount: number) => {
      const d = await fapiPost<any>(PATH, { invoice: Number(invoiceId), amount }, { action: 'start' })
      return { reference: String(d.reference), checkoutUrl: String(d.checkout_url ?? '') }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'online-payment', String(invoiceId)] }),
  })
}

// GET ?reference= polls an attempt: the payment exists on the invoice once the widget's callback ran.
export function useOnlinePaymentStatus(reference: string | undefined) {
  const queryClient = useQueryClient()
  return useQuery<OnlinePaymentStatus>({
    queryKey: ['invoices', 'online-payment-status', reference],
    enabled: !!reference,
    queryFn: async () => {
      const d = await fapiGet<any>(PATH, { reference })
      const paid = Boolean(d.dolibarr_payment)
      if (paid) void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      return { reference: String(d.reference), state: d.state ?? '', status: d.status ?? '', amount: Number(d.amount) || 0, currency: d.currency ?? '', paid, checkoutUrl: d.checkout_url ?? '' }
    },
    refetchInterval: (q) => (q.state.data && (q.state.data.paid || q.state.data.state === 'ABANDONED') ? false : 4000),
  })
}

// POST ?action=cancel abandons a stale attempt (only the local record changes; nothing is cancelled at Lenco).
export function useCancelOnlinePayment(invoiceId: string | number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reference: string) => fapiPost<any>(PATH, { reference }, { action: 'cancel' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'online-payment', String(invoiceId)] }),
  })
}
