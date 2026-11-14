import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registerProductsWithZra, type ZraRegisterManyAnswer } from '../../api/products'

// Bulk "Upload Products" of the Un-uploaded Products page: product/fapi/zra.php?action=register_many (see api/products.ts for the contract).
// A first call without confirm only previews what would be sent; the second one (confirm: true) sends it to ZRA and answers the per-product results.

export interface UploadLine {
  id: number | null
  name: string
  // true accepted, false refused, null when the entry says nothing either way (a planned entry of the preview)
  accepted: boolean | null
  // ZRA's own text for the product, when the entry has one
  message: string
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// One planned / results entry. Its fields are not documented, so only the usual names are read and anything else is ignored.
export function uploadLine(entry: Record<string, unknown>): UploadLine {
  const product = (entry.product ?? {}) as Record<string, unknown>
  const idValue = entry.id ?? entry.product_id ?? product.id
  const id = Number(idValue)
  const name = text(entry.ref) || text(entry.label) || text(entry.name) || text(entry.item_name) || text(product.ref) || text(product.label) || (Number.isFinite(id) && idValue != null ? `Product ${id}` : 'Product')
  const message = text(entry.error) || text(entry.message) || text(entry.reason) || text(entry.zra_message) || text(entry.status_message)
  let accepted: boolean | null = null
  for (const flag of [entry.accepted, entry.ok, entry.success, entry.registered]) {
    if (typeof flag === 'boolean') {
      accepted = flag
      break
    }
  }
  if (accepted === null && text(entry.error)) accepted = false
  return { id: Number.isFinite(id) && idValue != null ? id : null, name, accepted, message }
}

export interface UploadPreview {
  kind: 'preview'
  lines: UploadLine[]
}
export interface UploadOutcome {
  kind: 'sent'
  sent: number
  accepted: number
  refused: number
  lines: UploadLine[]
}

export function readUploadAnswer(answer: ZraRegisterManyAnswer): UploadPreview | UploadOutcome {
  if (answer.dry_run || (!('sent' in answer) && Array.isArray(answer.planned))) {
    return { kind: 'preview', lines: (answer.planned ?? []).map(uploadLine) }
  }
  return {
    kind: 'sent',
    sent: Number(answer.sent) || 0,
    accepted: Number(answer.accepted) || 0,
    refused: Number(answer.refused) || 0,
    lines: (answer.results ?? []).map(uploadLine),
  }
}

export function useUploadProductsToZra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, confirm }: { ids: number[]; confirm: boolean }) => readUploadAnswer(await registerProductsWithZra(ids, confirm)),
    onSuccess: (outcome) => {
      if (outcome.kind !== 'sent') return
      queryClient.invalidateQueries({ queryKey: ['zra'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
