import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { customerLookupsQuery, type CustomerLookups } from '../customers/thirdPartyOptions.queries'

// ── Dictionary options (same pattern as OrderCreateForm's useDictionary) ──

interface DictionaryOption {
  id: string
  text: string
}

interface DictionaryResponse {
  success: boolean
  results: Array<{ id: string | number; text: string }>
}

// GET /api/payment_types.php — real Dolibarr dictionary (llx_c_paiement),
// works via X-API-Key auth. Same endpoint OrderCreateForm uses.
export function usePaymentModes() {
  return useQuery({
    queryKey: ['dictionary', '/payment_types.php'],
    queryFn: async (): Promise<DictionaryOption[]> => {
      const { data } = await api.get<DictionaryResponse>('/payment_types.php')
      return data.success ? data.results.map((r) => ({ id: String(r.id), text: r.text })) : []
    },
    staleTime: 1000 * 60 * 10,
  })
}

// GET /api/bank_accounts.php — real Dolibarr dictionary (llx_bank_account),
// works via X-API-Key auth. Same endpoint OrderCreateForm uses.
export function useBankAccountOptions() {
  return useQuery({
    queryKey: ['dictionary', '/bank_accounts.php'],
    queryFn: async (): Promise<DictionaryOption[]> => {
      const { data } = await api.get<DictionaryResponse>('/bank_accounts.php')
      return data.success ? data.results.map((r) => ({ id: String(r.id), text: r.text })) : []
    },
    staleTime: 1000 * 60 * 10,
  })
}

// Payment terms (llx_c_payment_term) from societe/api/meta.php's
// wizard_options, the same rows/ids/order as the legacy order-create page's
// <select name="cond_reglement_id"> this used to download (1.7 MB) to read.
const toPaymentTermOptions = (lookups: CustomerLookups): DictionaryOption[] => lookups.paymentTerms.map((t) => ({ id: String(t.id), text: t.label }))

export function usePaymentTerms() {
  return useQuery({ ...customerLookupsQuery, select: toPaymentTermOptions })
}

// ── Customer defaults (auto-fill on customer selection) ──────────────────
// Mirrors the PHP workflow: when a customer is selected, fetch their
// stored payment terms, payment mode, bank account, currency, etc.
// Uses the same /api/salesorder/?action=get_customer endpoint as
// OrderCreateForm — confirmed real, returns fk_account, multicurrency_code,
// etc. The PHP invoice.php does the same via /core/ajax/thirdparty.php.

export interface CustomerInvoiceDefaults {
  fkAccount: string | null
  bankAccountName: string
  multicurrencyCode: string | null
  multicurrencyTx: number
  notePublic: string | null
  notePrivate: string | null
  outstandingBalance: number
  advanceAmount: number
  tpin: string | null
  branch: string | null
}

export function useCustomerInvoiceDefaults(socid: string) {
  return useQuery({
    queryKey: ['invoice', 'customer-defaults', socid],
    queryFn: async (): Promise<CustomerInvoiceDefaults> => {
      const { data } = await api.get<{
        success: boolean
        data: {
          fk_account: string | number | null
          bank_account: string
          multicurrency_code: string | null
          multicurrency_tx: number
          note_public: string | null
          note_private: string | null
        }
      }>('/salesorder/?action=get_customer', { params: { id: socid } })
      const d = data.data
      return {
        fkAccount: d.fk_account ? String(d.fk_account) : null,
        bankAccountName: d.bank_account ?? '',
        multicurrencyCode: d.multicurrency_code,
        multicurrencyTx: d.multicurrency_tx || 1,
        notePublic: d.note_public,
        notePrivate: d.note_private,
        outstandingBalance: 0,
        advanceAmount: 0,
        tpin: null,
        branch: null,
      }
    },
    enabled: socid !== '',
    staleTime: 1000 * 30,
  })
}

// The instance's configured currencies (llx_multicurrency), from the same
// wizard_options response — the same codes and labels as the classic create
// page's <select name="multicurrency_code">, without downloading that page a
// second time (fetchInvoiceCreateContext already loads it once).
const toCurrencyOptions = (lookups: CustomerLookups): DictionaryOption[] => lookups.currencies.map((c) => ({ id: c.code, text: c.name }))

export function useInvoiceCurrencies() {
  return useQuery({ ...customerLookupsQuery, select: toCurrencyOptions })
}
