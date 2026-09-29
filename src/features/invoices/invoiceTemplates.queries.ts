import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

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

interface RawTemplate {
  id: number
  ref: string
  socid: number
  thirdparty_name: string | null
  total_ht: number
  total_vat: number
  total_ttc: number
  frequency: number
  unit_frequency: string
  nb_gen_done: number
  nb_gen_max: number
  date_last_gen: string // MM/dd/yyyy or ''
  date_when: string
  status_label: 'Active' | 'Suspended' | 'Draft'
}

// "09/24/2026" -> "2026-09-24" (empty stays null)
const isoDate = (us: string): string | null => {
  const m = us.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null
}

// compta/sales/api/recurring_invoices_list.php — the JSON endpoint the classic
// "Template invoices" list (invoicetemplate_list.php) loads its own table
// from (see compta/sales/js/recurring_invoices_list.js): session-cookie auth,
// { success, total, rows[] } with every column the list shows. Replaces GET
// /api/invoice-templates/, which does not exist on the backend (404). One
// request returns them all (limit 1000); search/sort/paging stay client-side.
export function useInvoiceTemplates() {
  return useQuery({
    queryKey: ['invoice-templates'],
    queryFn: async (): Promise<{ items: InvoiceTemplateRow[]; total: number }> => {
      const { data } = await axios.get<{ success: boolean; error?: string; total: number; rows: RawTemplate[] }>('/compta/sales/api/recurring_invoices_list.php', {
        params: { page: 0, limit: 1000, sortfield: 'f.titre', sortorder: 'ASC' },
      })
      if (!data.success) throw new Error(data.error ?? 'Could not load template invoices.')
      const items = (data.rows ?? []).map(
        (r): InvoiceTemplateRow => ({
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
          dateLastGen: isoDate(r.date_last_gen ?? ''),
          dateNextGen: isoDate(r.date_when ?? ''),
          statusLabel: r.status_label,
        }),
      )
      return { items, total: data.total ?? items.length }
    },
  })
}
