import { useQuery } from '@tanstack/react-query'
import { fapiGet } from './fapiEnvelope'

// Dropdown sources every form shares, all key-authenticated fapi (the older /api/payment_types.php, /api/bank_accounts.php and
// /api/projects.php answer the HTML login page to a bare API key, so they only worked while a PHP session cookie existed).
export interface DictionaryOption {
  id: string
  text: string
}

interface InvoiceFormSettings {
  mode_options: Array<{ id: number; code: string; label: string }>
  bank_options: Array<{ id: number; ref: string; label: string }>
}

// compta/facture/fapi/form_settings.php: payment modes (llx_c_paiement), bank accounts and payment terms in one read.
const formSettingsKey = ['fapi', 'invoice-form-settings'] as const
const formSettingsFn = () => fapiGet<InvoiceFormSettings>('/compta/facture/fapi/form_settings.php')

// A payment mode is identified by its code ("01"), as the classic dictionary endpoint returned it.
export function usePaymentModeDictionary(enabled = true) {
  return useQuery({
    queryKey: formSettingsKey,
    queryFn: formSettingsFn,
    select: (d): DictionaryOption[] => d.mode_options.map((m) => ({ id: m.code, text: m.label })),
    enabled,
    staleTime: 1000 * 60 * 10,
  })
}

// Bank accounts by row id, labelled "label (ref)" like the classic dictionary.
export function useBankAccountDictionary(enabled = true) {
  return useQuery({
    queryKey: formSettingsKey,
    queryFn: formSettingsFn,
    select: (d): DictionaryOption[] => d.bank_options.map((b) => ({ id: String(b.id), text: `${b.label} (${b.ref})` })),
    enabled,
    staleTime: 1000 * 60 * 10,
  })
}

export interface ProjectOption {
  id: string
  ref: string
  title: string
}

// projet/fapi/list.php: the open projects, for every form's Project field (not narrowed to a customer).
export function useProjectOptions() {
  return useQuery({
    queryKey: ['projects', 'open'],
    queryFn: async (): Promise<ProjectOption[]> => {
      const d = await fapiGet<{ items?: Array<Record<string, unknown>> }>('/projet/fapi/list.php', { status: 'open', limit: 500 })
      return (d.items ?? []).map((p) => ({ id: String(p.id ?? ''), ref: String(p.ref ?? ''), title: String(p.title ?? p.label ?? p.name ?? '') }))
    },
    staleTime: 1000 * 60,
  })
}
