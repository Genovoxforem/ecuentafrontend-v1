import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { usDateFromIso } from '../../utils/dates'
import { formatMoney } from '../../utils/format'
import { useCustomerOptions } from '../customers/customerOptions'

// Create Rebate Invoice (Value Credit Note), read from JSON only; the classic custom/zra/rebate_create.php page and its HTML reader are gone.
//   customers   societe/fapi/list.php?type=customer: 34 on 5.10, the same 34 ids as the classic page's third-party picker (13 Nov 2026)
//   invoices    custom/zra/fapi/rebate_create.php?socid=
//               -> {customer {id, name, tpin}, invoices [{id, ref, date "2026-11-10", total_ht, total_tva, total_ttc, zra_status}]}
//               the validated standard invoices ZRA accepted, with no rebate against them yet. Without socid it answers 422 "socid is
//               required" (so the customers cannot come from it); an unknown customer is a 404 "Customer not found".
// Read on 5.10 (customer 20: invoices with their ZRA status). newecuenta answers the same route but holds none of these customers, so no row
// was read there.

export interface RebateInvoiceRow {
  id: string
  ref: string
  date: string
  amountHt: string
  vat: string
  amountTtc: string
  zraStatus: string
}
export interface RebateCreateForm {
  customers: { value: string; label: string }[]
  socid: string
  invoices: RebateInvoiceRow[]
}

interface EligibleAnswer {
  customer?: { id?: number; name?: string; tpin?: string }
  invoices?: { id: number; ref: string; date?: string | null; total_ht?: number; total_tva?: number; total_ttc?: number; zra_status?: string | null }[]
}

export function mapEligibleInvoices(d: EligibleAnswer): RebateInvoiceRow[] {
  return (d.invoices ?? []).map((i) => ({
    id: String(i.id),
    ref: i.ref,
    date: usDateFromIso(i.date),
    amountHt: formatMoney(i.total_ht),
    vat: formatMoney(i.total_tva),
    amountTtc: formatMoney(i.total_ttc),
    zraStatus: i.zra_status ?? '',
  }))
}

// "AL BARAKA BAKERY (CU2506-00019)": the name and the customer code, as the picker prints them.
export const customerLabel = (c: { name: string; ref?: string }) => (c.ref ? `${c.name} (${c.ref})` : c.name)

export function useRebateCreateForm(socid: string) {
  const customers = useCustomerOptions()
  const invoices = useQuery({
    queryKey: ['zra', 'rebateCreate', socid],
    queryFn: async () => mapEligibleInvoices(await fapiGet<EligibleAnswer>('/custom/zra/fapi/rebate_create.php', { socid })),
    enabled: socid !== '',
    staleTime: 0,
    placeholderData: keepPreviousData, // keep the table on screen while another customer loads
  })
  const data: RebateCreateForm | undefined = customers.data
    ? { customers: customers.data.map((c) => ({ value: c.id, label: customerLabel(c) })), socid, invoices: socid ? (invoices.data ?? []) : [] }
    : undefined
  return {
    data,
    isLoading: customers.isLoading,
    isFetching: invoices.isFetching,
    // The table of a customer is on its way (a different customer's table, or none yet, is on screen).
    isPlaceholderData: socid !== '' && (invoices.isPlaceholderData || invoices.isLoading),
    isError: customers.isError || invoices.isError,
    error: customers.error ?? invoices.error,
    refetch: () => {
      void customers.refetch()
      if (socid) void invoices.refetch()
    },
  }
}
