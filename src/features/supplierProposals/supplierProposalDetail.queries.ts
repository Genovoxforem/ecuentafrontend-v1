/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

export const SP_BASE = '/supplier_proposal/fapi'

export interface ProposalLine {
  lineId: number
  productId: number
  productRef: string
  productLabel: string
  description: string
  refSupplier: string
  qty: number
  unitPriceHt: number
  vatRate: number
  discountPercent: number
  totalHt: number
  totalTva: number
  totalTtc: number
}

export interface ProposalAction {
  key: string
  enabled: boolean
  reason: string
}

export interface ProposalDetail {
  id: number
  ref: string
  status: number
  statusLabel: string
  socid: number | null
  vendorName: string
  vendorCode: string
  dateCreation: string
  dateValid: string
  dateClosed: string
  dateDelivery: string
  notePublic: string
  notePrivate: string
  currency: string
  totalHt: number
  totalTva: number
  totalTtc: number
  lines: ProposalLine[]
  actions: ProposalAction[]
  docModels: { value: string; label: string }[]
  defaultModel: string
  documents: { name: string; url: string; size: string; date: string }[]
  canWrite: boolean
}

const day = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 10) : '')

function mapDetail(d: any): ProposalDetail {
  const p = d.proposal ?? {}
  const supplier = d.supplier ?? {}
  return {
    id: Number(p.id),
    ref: p.ref ?? '',
    status: Number(p.status) || 0,
    statusLabel: p.status_label ?? '',
    socid: p.socid != null ? Number(p.socid) : supplier.id != null ? Number(supplier.id) : null,
    vendorName: supplier.name ?? '',
    vendorCode: supplier.code ?? '',
    dateCreation: day(p.date_creation),
    dateValid: day(p.date_valid),
    dateClosed: day(p.date_closed),
    dateDelivery: day(p.date_delivery),
    notePublic: p.note_public ?? '',
    notePrivate: p.note_private ?? '',
    currency: d.totals?.currency ?? '',
    totalHt: Number(d.totals?.total_ht) || 0,
    totalTva: Number(d.totals?.total_tva) || 0,
    totalTtc: Number(d.totals?.total_ttc) || 0,
    lines: (d.lines ?? []).map((l: any) => ({
      lineId: Number(l.line_id),
      productId: Number(l.product_id) || 0,
      productRef: l.product_ref ?? '',
      productLabel: l.product_label ?? '',
      description: l.description ?? '',
      refSupplier: l.ref_supplier ?? '',
      qty: Number(l.qty) || 0,
      unitPriceHt: Number(l.pu_ht) || 0,
      vatRate: Number(l.tva_tx) || 0,
      discountPercent: Number(l.remise_percent) || 0,
      totalHt: Number(l.total_ht) || 0,
      totalTva: Number(l.total_tva) || 0,
      totalTtc: Number(l.total_ttc) || 0,
    })),
    actions: (d.available_actions ?? []).map((a: any) => ({ key: String(a.key), enabled: Boolean(a.enabled), reason: String(a.disabled_because ?? '') })),
    docModels: (d.doc_models ?? []).map((m: any) => ({ value: String(m.value ?? m.id ?? m), label: String(m.label ?? m.value ?? m) })),
    defaultModel: String(d.default_model ?? ''),
    documents: (d.documents ?? []).map((f: any) => ({ name: String(f.name ?? ''), url: String(f.url ?? ''), size: String(f.size ?? ''), date: String(f.date ?? '') })),
    canWrite: Boolean(d.permissions?.write),
  }
}

// supplier_proposal/fapi/get.php: the proposal, its lines, totals, the rights and available_actions (each action
// says whether it would be accepted now and, if not, why), the document models and the generated documents.
export function useSupplierProposalDetail(id: string | undefined) {
  return useQuery<ProposalDetail>({
    queryKey: ['supplier-proposals', 'detail', id],
    queryFn: async () => mapDetail(await fapiGet<any>(`${SP_BASE}/get.php`, { id })),
    enabled: !!id,
  })
}

function useRefresh(id: string | undefined) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['supplier-proposals', 'detail', id] })
    void queryClient.invalidateQueries({ queryKey: ['supplier-proposals', 'list'] })
    void queryClient.invalidateQueries({ queryKey: ['supplier-proposals', 'summary'] })
  }
}

export type ProposalActionKey = 'validate' | 'set_draft' | 'close_signed' | 'close_refused' | 'close' | 'reopen' | 'clone' | 'delete' | 'build_doc' | 'set_fields'

// POST actions.php?action=…: re-checks the state and the right itself (409 / 403), answers the new status.
export function useProposalAction(id: string | undefined) {
  const refresh = useRefresh(id)
  return useMutation({
    mutationFn: async ({ action, extra }: { action: ProposalActionKey; extra?: Record<string, unknown> }) => fapiPost<any>(`${SP_BASE}/actions.php`, { id: Number(id), ...extra }, { action }),
    onSuccess: refresh,
  })
}

export interface ProposalLineInput {
  description: string
  qty: number
  unitPriceHt: number
  vatRate: number
  discountPercent?: number
  productId?: number
}

// POST lines.php?action=add|update|delete. The server handles remise_type ('0.0' by default) and the
// disagreeing addline() / updateline() argument orders.
export function useProposalLines(id: string | undefined) {
  const refresh = useRefresh(id)
  const body = (input: ProposalLineInput) => ({
    ...(input.productId ? { product_id: input.productId } : {}),
    description: input.description,
    qty: input.qty,
    pu_ht: input.unitPriceHt,
    tva_tx: input.vatRate,
    remise_percent: input.discountPercent ?? 0,
  })
  return {
    add: useMutation({ mutationFn: (input: ProposalLineInput) => fapiPost<any>(`${SP_BASE}/lines.php`, { id: Number(id), ...body(input) }, { action: 'add' }), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ lineId, ...input }: ProposalLineInput & { lineId: number }) => fapiPost<any>(`${SP_BASE}/lines.php`, { id: Number(id), line_id: lineId, ...body(input) }, { action: 'update' }), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (lineId: number) => fapiPost<any>(`${SP_BASE}/lines.php`, { id: Number(id), line_id: lineId }, { action: 'delete' }), onSuccess: refresh }),
  }
}
