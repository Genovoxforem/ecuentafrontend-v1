import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Real reference page: delivery/card.php?action=pack_list ("Packing
// Details"). SELECT * FROM llx_packing, read directly from source — a
// genuine, simple custom Ecuenta table, no joins, no JSON endpoint but a
// single classic HTML table with everything already needed in one fetch.
// The "Update Delivery Status" dropdown and the Delete action are both real,
// single-step backend writes (also read directly from source):
//   action=update_status: UPDATE llx_packing SET delivery_status=<dele_status>
//     WHERE rowid=<id> — id here is the PACKING record's own rowid (matches
//     the real page's own JS: del_id is the packing rowid, not shipment_id
//     or delivary_id, confirmed by reading both the print() call building
//     the <select> id and the action's own SQL).
//   action=packing_delet: DELETE FROM llx_packing WHERE rowid=<pack_id> — a
//     genuine unconfirmed single-step delete on the real page itself (no
//     confirm box, no client-side confirm() either); this wraps it in
//     window.confirm() anyway since a silent destructive delete is worth
//     guarding even where the reference app doesn't.
export const DELIVERY_STATUS_LABEL: Record<number, string> = {
  0: 'Delivery In Progress',
  1: 'Ready To Deliver',
  2: 'Delivered',
  3: 'Returned',
  4: 'Not Delivered',
}

export interface PackingRow {
  packId: number
  ref: string
  shipmentId: number | null
  orderStatus: string
  packingDate: string
  deliveryStatus: number
}

function parsePackingList(html: string): PackingRow[] {
  const rows: PackingRow[] = []
  const rowRe = /<tr><td>\d+<\/td><td><a href ="\/delivery\/card\.php\?id=(\d+)&action=packing_view">([^<]*)<\/a><\/td><td>([\s\S]*?)<\/td><td>([^<]*)<\/td>\s*<td>\s*<select[^>]*id="dele_status(\d+)">([\s\S]*?)<\/select>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(html))) {
    const optionsHtml = m[6]
    const selectedMatch = optionsHtml.match(/<option value="(\d+)" Selected>/)
    rows.push({
      packId: Number(m[5]),
      ref: m[2].trim(),
      shipmentId: Number(m[1]) || null,
      orderStatus: m[3].replace(/<[^>]*>/g, '').trim(),
      packingDate: m[4].trim(),
      deliveryStatus: selectedMatch ? Number(selectedMatch[1]) : 0,
    })
  }
  return rows
}

export function usePackingList() {
  return useQuery({
    queryKey: ['warehouses', 'packingList'],
    queryFn: async (): Promise<PackingRow[]> => {
      const res = await fetch('/delivery/card.php?action=pack_list', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parsePackingList(await res.text())
    },
    staleTime: 1000 * 30,
  })
}

export function useUpdatePackingDeliveryStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ packId, deliveryStatus }: { packId: number; deliveryStatus: number }) => {
      const res = await fetch(`/delivery/card.php?id=${packId}&dele_status=${deliveryStatus}&action=update_status`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'packingList'] }),
  })
}

export function useDeletePacking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (packId: number) => {
      const res = await fetch(`/delivery/card.php?id=&pack_id=${packId}&action=packing_delet`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'packingList'] }),
  })
}
