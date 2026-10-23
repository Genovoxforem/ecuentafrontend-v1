import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiPost } from '../../api/fapiEnvelope'
import { loadVatPaymentForm } from './specialMetaFapi'

// The "VAT - New" form: its dropdowns from compta/tva/fapi/meta.php, the payment saved through declaration.php?action=create.

export interface SalesTaxOption {
  value: string
  label: string
}

export interface SalesTaxCreateForm {
  token: string
  bankAccounts: SalesTaxOption[]
  paymentTypes: SalesTaxOption[]
  defaultLabels: { payment: string; refund: string }
  defaultDate: string // MM/dd/yyyy
}

export function useSalesTaxCreateForm() {
  return useQuery({
    queryKey: ['generalLedger', 'salesTaxCreate'],
    // compta/tva/fapi/meta.php: the bank accounts and payment types (no token is needed any more).
    queryFn: loadVatPaymentForm,
    staleTime: 10 * 60_000,
  })
}

export interface SalesTaxInput {
  token: string
  refund: boolean
  datep: string // MM/dd/yyyy
  datev: string
  label: string
  amount: string
  accountid: string
  typePayment: string
  numPayment: string
}

const isoDate = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null
}

// compta/tva/fapi/declaration.php?action=create (Tva::addPayment): refund negates the amount, datev defaults to datep.
export function salesTaxBody(i: SalesTaxInput) {
  const n = i.amount.replace(/,/g, '').trim()
  return {
    label: i.label.trim() || null, amount: n === '' ? null : Number(n), type_payment: Number(i.typePayment) || null, datep: isoDate(i.datep), datev: isoDate(i.datev),
    accountid: Number(i.accountid) || null, num_payment: i.numPayment.trim() || null, refund: i.refund,
  }
}

export function useCreateSalesTax() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalesTaxInput): Promise<{ id: string | null }> => {
      const res = await fapiPost<{ id: number }>('/compta/tva/fapi/declaration.php', salesTaxBody(input), { action: 'create' })
      return { id: String(res.id) }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
