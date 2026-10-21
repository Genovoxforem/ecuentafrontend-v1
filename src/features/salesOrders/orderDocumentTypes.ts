// Shapes of the linked-files tab (the files of a record, its links and the totals line). Filled from each module's
// documents.php; nothing here parses HTML any more.
export type { OrderDocumentRow, LinkedFileRow } from './orderDetail.types'
import type { LinkedFileRow } from './orderDetail.types'

export interface DocumentsPageMeta {
  attachedCount: number
  totalSize: string
  savingDocMask: string
  // The classic upload form's CSRF token; the fapi upload needs none, so this stays ''.
  attachToken: string
  links: LinkedFileRow[]
}
