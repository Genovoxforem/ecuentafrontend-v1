/**
 * core/fapi/links.php — link any document to any other (quotation, order, invoice,
 * contract, shipment) through llx_element_element. GET lists the links and the
 * linkable types; GET ?action=search finds candidates for the same customer;
 * POST ?action=add / delete change the links.
 */

import { fapi } from './axios'

interface Envelope<T> {
  success: boolean
  data: T
  message: string | null
  errors: unknown
}

function unwrap<T>(body: Envelope<T>, fallback: string): T {
  if (!body?.success) throw new Error(body?.message || fallback)
  return body.data
}

export type LinkElement = 'propal' | 'commande' | 'facture' | 'contrat' | 'shipping'

export const LINK_ELEMENT_LABELS: Record<LinkElement, string> = {
  propal: 'Quotation',
  commande: 'Sales order',
  facture: 'Customer invoice',
  contrat: 'Contract',
  shipping: 'Shipment',
}

export interface LinkCandidate {
  id: number
  ref: string
  date: string
  status: string
  alreadyLinked: boolean
}

export interface LinksInfo {
  canEdit: boolean
  linkable: LinkElement[]
}

export async function fetchLinksInfo(element: LinkElement, id: number): Promise<LinksInfo> {
  const res = await fapi.get<Envelope<{ can_edit?: boolean; linkable?: LinkElement[] }>>('/core/fapi/links.php', { params: { element, id } })
  const d = unwrap(res.data, 'Could not load the document links.')
  return { canEdit: d.can_edit !== false, linkable: d.linkable ?? [] }
}

export async function searchLinkCandidates(element: LinkElement, id: number, type: LinkElement, q: string): Promise<{ items: LinkCandidate[]; truncated: boolean }> {
  const res = await fapi.get<Envelope<{ items?: Array<Record<string, unknown>>; truncated?: boolean }>>('/core/fapi/links.php', { params: { action: 'search', element, id, type, q } })
  const d = unwrap(res.data, 'Could not search the documents.')
  return {
    truncated: !!d.truncated,
    items: (d.items ?? []).map((raw) => ({
      id: Number(raw.id ?? raw.target_id ?? 0),
      ref: String(raw.ref ?? raw.label ?? ''),
      date: String(raw.date ?? raw.datec ?? ''),
      status: String(raw.status_label ?? raw.status ?? ''),
      alreadyLinked: Boolean(raw.already_linked),
    })),
  }
}

export async function addDocumentLink(input: { element: LinkElement; id: number; type: LinkElement; target_id: number }): Promise<void> {
  const res = await fapi.post<Envelope<unknown>>('/core/fapi/links.php', input, { params: { action: 'add' }, validateStatus: () => true })
  unwrap(res.data, 'Could not link the documents.')
}

export async function deleteDocumentLink(input: { element: LinkElement; id: number; rowid: number }): Promise<void> {
  const res = await fapi.post<Envelope<unknown>>('/core/fapi/links.php', input, { params: { action: 'delete' }, validateStatus: () => true })
  unwrap(res.data, 'Could not remove the link.')
}
