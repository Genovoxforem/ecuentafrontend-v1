import { useQuery } from '@tanstack/react-query'
import { useBankAccountDictionary, usePaymentModeDictionary } from '../../api/lookups'
import { api, fapi } from '../../api/axios'
import { customerLookupsQuery, type CustomerLookups } from '../customers/thirdPartyOptions.queries'

// ── Dictionary options (same pattern as OrderCreateForm's useDictionary) ──

interface DictionaryOption {
  id: string
  text: string
}


// GET /api/payment_types.php — real Dolibarr dictionary (llx_c_paiement),
// works via X-API-Key auth. Same endpoint OrderCreateForm uses.
export function usePaymentModes() {
  return usePaymentModeDictionary()
}

// GET /api/bank_accounts.php — real Dolibarr dictionary (llx_bank_account),
// works via X-API-Key auth. Same endpoint OrderCreateForm uses.
export function useBankAccountOptions() {
  return useBankAccountDictionary()
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
          outstanding_balance?: string | number | null
        }
      }>('/salesorder/?action=get_customer', { params: { id: socid } })
      const d = data.data
      // What the customer still owes (get_customer returns it) and the advance payments they have left
      // (compta/facture/fapi/advances.php totals); the classic page shows both on its customer card.
      const advance = await fapi
        .get<{ data?: { totals?: { remaining_amount?: number } } }>('/compta/facture/fapi/advances.php', { params: { socid, limit: 1 } })
        .then((r) => Number(r.data?.data?.totals?.remaining_amount) || 0)
        .catch(() => 0)
      // societe/fapi/get.php reports the figure from Societe::getOutstandingBills() (62.00 on newecuenta);
      // get_customer's own figure ignores payments (84.00), so it is only the fallback.
      const outstanding = await fapi
        .get<{ data?: { outstanding?: { opened?: number }; outstanding_balance?: number } }>('/societe/fapi/get.php', { params: { id: socid } })
        .then((r) => {
          const v = r.data?.data
          return v?.outstanding?.opened ?? (typeof v?.outstanding_balance === 'number' && v.outstanding_balance !== 1 ? v.outstanding_balance : undefined)
        })
        .catch(() => undefined)
      return {
        fkAccount: d.fk_account ? String(d.fk_account) : null,
        bankAccountName: d.bank_account ?? '',
        multicurrencyCode: d.multicurrency_code,
        multicurrencyTx: d.multicurrency_tx || 1,
        notePublic: d.note_public,
        notePrivate: d.note_private,
        outstandingBalance: outstanding ?? (Number(d.outstanding_balance) || 0),
        advanceAmount: advance,
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
