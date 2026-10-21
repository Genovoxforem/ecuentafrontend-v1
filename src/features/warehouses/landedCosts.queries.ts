/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { isoDate, pickNum, pickStr } from '../../api/fapiRow'
import { useVendorInvoices } from '../vendorInvoices/vendorInvoices.queries'

const LC = '/fourn/facture/fapi/landed_costs.php'

export interface LandedCostRow {
  key: string
  date: string
  invoiceRef: string
  invoiceId: string
  product: string
  vendor: string
  vendorId: string
  expense: string
  amount: number
  allocated: number
  unallocated: number
}

export interface LandedCostProduct {
  id: string
  label: string
}

export interface LandedCostListData {
  rows: LandedCostRow[]
  products: LandedCostProduct[]
}

// GET landed_costs.php?invoice=: the invoice lines, the allocations and the effective unit cost per product.
// There is no endpoint that lists landed costs across invoices (it answers 422 "invoice is required"), so the
// list reads the 100 most recent vendor invoices and asks for each one's allocations, six at a time; the product
// filter is applied here. A single list endpoint is on the backend request list. Allocation rows are read
// defensively because newecuenta holds no vendor invoice to allocate against (the vendor invoices cannot be
// created there until llx_facture_fourn.internal_exp exists).
function rowsFromInvoice(invoice: { id: number | null; ref: string; vendor: string; vendorId: number | null; date: string }, d: any): LandedCostRow[] {
  const allocations: any[] = d.allocations ?? d.landed_costs ?? d.costs ?? []
  return allocations.map((a, i) => {
    const amount = pickNum(a, 'amount', 'cost', 'landed_cost_amount')
    const allocated = pickNum(a, 'allocated', 'allocated_amount')
    return {
      key: `${invoice.id}-${pickStr(a, 'id') || i}`,
      date: isoDate(a.date ?? a.date_creation ?? invoice.date),
      invoiceRef: invoice.ref,
      invoiceId: String(invoice.id ?? ''),
      product: pickStr(a, 'product.label', 'product_label', 'product.ref', 'product_ref'),
      vendor: invoice.vendor,
      vendorId: String(invoice.vendorId ?? ''),
      expense: pickStr(a, 'description', 'label', 'label_or_amount.label', 'landed_cost'),
      amount,
      allocated,
      unallocated: a.unallocated != null ? Number(a.unallocated) || 0 : amount - allocated,
    }
  })
}

export function useLandedCostList(productId: string) {
  const invoices = useVendorInvoices('all')
  const candidates = (invoices.data?.items ?? []).filter((v) => v.id).slice(0, 100)
  const key = candidates.map((c) => c.id).join(',')
  const q = useQuery({
    queryKey: ['warehouses', 'landedCosts', key],
    enabled: !invoices.isLoading && candidates.length > 0,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<LandedCostRow[]> => {
      const out: LandedCostRow[] = []
      for (let i = 0; i < candidates.length; i += 6) {
        const chunk = candidates.slice(i, i + 6)
        const parts = await Promise.all(
          chunk.map(async (v) => {
            try {
              const d = await fapiGet<any>(LC, { invoice: v.id ?? undefined })
              return rowsFromInvoice({ id: v.id, ref: v.ref, vendor: v.thirdPartyName ?? '', vendorId: v.thirdPartyId, date: v.invoiceDate ?? '' }, d)
            } catch {
              return []
            }
          }),
        )
        out.push(...parts.flat())
      }
      return out
    },
  })
  const all = q.data ?? []
  const products = Array.from(new Set(all.map((r) => r.product).filter(Boolean))).map((label) => ({ id: label, label }))
  const rows = productId ? all.filter((r) => r.product === productId) : all
  return {
    data: { rows, products } as LandedCostListData,
    isLoading: invoices.isLoading || (candidates.length > 0 && q.isLoading),
    isError: invoices.isError || q.isError,
    error: invoices.error ?? q.error,
    refetch: () => {
      void invoices.refetch()
      void q.refetch()
    },
  }
}

export interface LandedCostInput {
  invoiceId: number
  method: 'value' | 'quantity'
  costs: { description: string; amount: number }[]
}

// POST ?action=allocate spreads the costs over the goods lines on the server (by value or quantity, parts add up
// to the total exactly); dry_run:true returns the split without writing. The product's pmp is not changed.
export function useAllocateLandedCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, dryRun }: { input: LandedCostInput; dryRun: boolean }) =>
      fapiPost<any>(LC, { invoice: input.invoiceId, method: input.method, costs: input.costs, dry_run: dryRun }, { action: 'allocate' }),
    onSuccess: (_d, { dryRun }) => {
      if (!dryRun) void queryClient.invalidateQueries({ queryKey: ['warehouses', 'landedCosts'] })
    },
  })
}
