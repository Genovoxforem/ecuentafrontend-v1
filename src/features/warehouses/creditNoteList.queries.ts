import { useQuery } from '@tanstack/react-query'

// Real reference page: retunorder/card.php?action=list ("Return List").
// SELECT * FROM llx_facture WHERE type=2 AND fk_statut>0 — real Dolibarr
// credit notes (invoice type 2), read directly from source. No JSON exists
// (confirmed: retunorder/ has no ajax file besides save_ajax.php, which only
// handles the create-return form, not this list), but the whole table is
// classic HTML in one page load — a single real fetch.
//
// "Order Status" is genuinely hardcoded to "Refund" in this build — the
// PHP source's own Exchange/Not-Updated branches are commented out, so
// every real row shows "Refund" regardless of any actual status field. Not
// a parsing gap; reproduced faithfully because it's what the real page does.
// "Sl.No" in the reference is a loop counter that's never incremented
// (prints "1" for every row, confirmed live) — that's a real backend bug
// with no data meaning at all, so this uses a proper 1-based row index
// instead rather than faithfully reproducing a counter that's just broken.
export interface CreditNoteRow {
  ref: string
  invoiceId: number
  createdDate: string
}

function parseCreditNoteList(html: string): CreditNoteRow[] {
  const rows: CreditNoteRow[] = []
  const rowRe = /<a href ="\/compta\/sales\/card\.php\?facid=(\d+)&action=view">([^<]*)<\/a><\/td><td>[\s\S]*?<\/span><\/td><td>([^<]*)<\/td>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(html))) {
    rows.push({ invoiceId: Number(m[1]), ref: m[2].trim(), createdDate: m[3].trim() })
  }
  return rows
}

export function useCreditNoteList() {
  return useQuery({
    queryKey: ['warehouses', 'creditNoteList'],
    queryFn: async (): Promise<CreditNoteRow[]> => {
      const res = await fetch('/retunorder/card.php?id=&action=list', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseCreditNoteList(await res.text())
    },
    staleTime: 1000 * 30,
  })
}
