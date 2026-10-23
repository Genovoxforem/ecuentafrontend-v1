import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

export interface InvoiceTemplateRow {
  id: number
  ref: string
  thirdParty: string | null
  socid: number | null
  amountExclTax: number
  vat: number
  amountInclTax: number
  isRecurring: boolean
  frequency: number
  frequencyUnit: string
  nbGenDone: number
  nbGenMax: number
  dateLastGen: string | null
  dateNextGen: string | null
  statusLabel: 'Active' | 'Suspended' | 'Draft'
}

export interface FapiTemplate {
  id: number
  ref: string
  socid: number
  thirdparty_name: string | null
  total_ht: number
  total_vat: number
  total_ttc: number
  frequency: number
  unit_frequency: string | null
  nb_gen_done: number
  nb_gen_max: number
  date_last_gen: string | null
  date_when: string | null
  status_label: 'Active' | 'Suspended' | 'Draft'
}

// An ISO date or date-time -> "2026-09-24" (empty stays null)
const isoDate = (v: string | null): string | null => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null)

export const mapTemplate = (r: FapiTemplate): InvoiceTemplateRow => ({
  id: r.id,
  ref: r.ref,
  thirdParty: r.thirdparty_name,
  socid: r.socid || null,
  amountExclTax: r.total_ht,
  vat: r.total_vat,
  amountInclTax: r.total_ttc,
  isRecurring: r.frequency > 0,
  frequency: r.frequency,
  frequencyUnit: r.unit_frequency ?? '',
  nbGenDone: r.nb_gen_done,
  nbGenMax: r.nb_gen_max,
  dateLastGen: isoDate(r.date_last_gen),
  dateNextGen: isoDate(r.date_when),
  statusLabel: r.status_label,
})

// compta/facture/fapi/recurring_invoices.php — the template (recurring) invoices with every column the list shows, replacing the
// session-only compta/sales/api/recurring_invoices_list.php. Captured from newecuenta on 23 Oct 2026 (tests/fixtures/recurring-invoices.json).
// One request returns them all (limit 1000); search/sort/paging stay client-side.
export function useInvoiceTemplates() {
  return useQuery({
    queryKey: ['invoice-templates', 'fapi'],
    queryFn: async (): Promise<{ items: InvoiceTemplateRow[]; total: number }> => {
      const d = await fapiGet<{ items: FapiTemplate[]; pagination: { total: number } }>('/compta/facture/fapi/recurring_invoices.php', { limit: 1000 })
      return { items: d.items.map(mapTemplate), total: d.pagination.total }
    },
  })
}
