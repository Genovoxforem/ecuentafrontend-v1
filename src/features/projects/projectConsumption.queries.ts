import { useMutation, useQueryClient } from '@tanstack/react-query'

// Real `action=conso` handler on custom/consumption/card.php (read
// directly) — same real POST the Quotations feature already uses
// (useDeclareConsumption in quotationDetail.queries.ts), just with
// type=projet instead of type=propal. product/id_entrepot/nbpiece/label/
// eatby/sellby, redirects back to the same page on success (a real GET
// redirect, not JSON — success/failure here is just whether the request
// completed). No JSON list endpoint exists for the consumption history
// table though (confirmed: no json_encode anywhere in this module), so
// that stays an honest empty state in ProjectStockConsumptionsTab.tsx.
export function useDeclareProjectConsumption(projectId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { productId: string; warehouseId: string; qty: number; label: string; eatBy?: string; sellBy?: string }) => {
      const body = new URLSearchParams({
        action: 'conso',
        type: 'projet',
        id: String(projectId ?? ''),
        product: input.productId,
        id_entrepot: input.warehouseId,
        nbpiece: String(input.qty),
        label: input.label,
        batch_number: '',
        eatby: input.eatBy ?? '',
        sellby: input.sellBy ?? '',
      })
      const res = await fetch(`/custom/consumption/card.php?id=${projectId}&type=projet`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', 'detail', projectId, 'consumption'] }),
  })
}
