import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// admin/fapi/whatsapp.php and admin/fapi/cashflow.php (12 Nov 2026, AN-181 / AN-182 read side): key-authenticated, admin only, read-only. The saves have no fapi
// writer yet (raw INSERT / UPDATE on the backend), and this app does not call the classic session requests any more (BUG-95), so both pages are read-only.
//
// whatsapp.php: {enabled, id, instance, token_set, note}. The token itself is never sent. Read on newecuenta: the WhatsApp module is not installed there, so the
// answer is {enabled: false, id: null, instance: '', token_set: false, note: 'llx_whatsapp_settings does not exist on this instance ...'}; the answer of an
// instance that has the module and a saved row was NOT seen (the field that carries the masked token hint is unknown, so none is read).
export interface WhatsappSettings {
  enabled: boolean
  id: number | null
  instance: string
  tokenSet: boolean
  note: string
}

interface FapiWhatsapp {
  enabled?: boolean
  id?: number | null
  instance?: string | null
  token_set?: boolean
  note?: string | null
}

export function useWhatsappSettings() {
  return useQuery({
    queryKey: ['settings', 'whatsapp'],
    queryFn: async (): Promise<WhatsappSettings> => {
      const d = await fapiGet<FapiWhatsapp>('/admin/fapi/whatsapp.php')
      return { enabled: !!d.enabled, id: d.id ?? null, instance: d.instance ?? '', tokenSet: !!d.token_set, note: d.note ?? '' }
    },
    staleTime: 1000 * 60,
    retry: false,
  })
}

// cashflow.php: the accounting-account codes picked for each cash-flow section (operating / investing / financing, each with inflow and outflow) and the chart
// of accounts the selects offer ({account_number, label}; 370 on newecuenta). Read on newecuenta: operating inflow = outflow = 1090, 1091, 1095; investing 2010;
// financing 1092, 1093, 1095, 1096.
export type CashflowSection = 'operating' | 'investing' | 'financing'

export interface CashflowSettings {
  sections: Record<CashflowSection, { inflow: string[]; outflow: string[] }>
  // account number -> label, to print "1090-Cash in Hand" like the classic page
  labels: ReadonlyMap<string, string>
}

interface FapiCashflow {
  operating?: { inflow?: string[]; outflow?: string[] }
  investing?: { inflow?: string[]; outflow?: string[] }
  financing?: { inflow?: string[]; outflow?: string[] }
  accounts?: Array<{ account_number: string; label: string }>
}

const pick = (s?: { inflow?: string[]; outflow?: string[] }) => ({ inflow: (s?.inflow ?? []).map(String), outflow: (s?.outflow ?? []).map(String) })

export function useCashflowSettings() {
  return useQuery({
    queryKey: ['settings', 'cashflow'],
    queryFn: async (): Promise<CashflowSettings> => {
      const d = await fapiGet<FapiCashflow>('/admin/fapi/cashflow.php')
      const labels = new Map((d.accounts ?? []).map((a): [string, string] => [String(a.account_number), a.label]))
      // like the classic selects, only the accounts of the chart are shown (a stored account the chart does not list is not an option there)
      const known = (s?: { inflow?: string[]; outflow?: string[] }) => {
        const p = pick(s)
        return { inflow: p.inflow.filter((c) => labels.has(c)), outflow: p.outflow.filter((c) => labels.has(c)) }
      }
      return { sections: { operating: known(d.operating), investing: known(d.investing), financing: known(d.financing) }, labels }
    },
    staleTime: 1000 * 60,
    retry: false,
  })
}

// "1090-Cash in Hand": the account number and its label from the chart of accounts (the number alone when the chart has no such account).
export function accountLabel(code: string, labels: ReadonlyMap<string, string>): string {
  const label = labels.get(code)
  return label ? `${code}-${label}` : code
}
