import { useQuery } from '@tanstack/react-query'
import { parseOrderCardHtml, parseOrderNotesHtml, parseOrderDocumentsHtml, type OrderDetail, type OrderNotes, type OrderDocumentRow } from './orderCardParser'

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res.text()
}

export function useOrderDetail(id: string | undefined) {
  return useQuery<OrderDetail>({
    queryKey: ['salesOrders', 'detail', id],
    queryFn: async () => parseOrderCardHtml(await fetchHtml(`/commande/card.php?id=${id}&save_lastsearch_values=1`), Number(id)),
    enabled: !!id,
  })
}

export function useOrderNotes(id: string | undefined) {
  return useQuery<OrderNotes>({
    queryKey: ['salesOrders', 'detail', id, 'notes'],
    queryFn: async () => parseOrderNotesHtml(await fetchHtml(`/commande/note.php?id=${id}`)),
    enabled: !!id,
  })
}

export function useOrderDocuments(id: string | undefined) {
  return useQuery<OrderDocumentRow[]>({
    queryKey: ['salesOrders', 'detail', id, 'documents'],
    queryFn: async () => parseOrderDocumentsHtml(await fetchHtml(`/commande/document.php?id=${id}`)),
    enabled: !!id,
  })
}
