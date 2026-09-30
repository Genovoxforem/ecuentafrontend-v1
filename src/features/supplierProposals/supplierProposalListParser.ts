// Parses the real supplier_proposal/supplier_proposal_ajax.php — the server-side
// DataTables endpoint behind supplier_proposal/list.php ("Vendor Quotation"),
// verified live against the dev backend. The response is DataTables' own
// {draw, recordsTotal, recordsFiltered, data} shape; each `data` row carries
// plain values (rowid, date_valid, date_livraison, total_ht, total_ttc,
// date_creation) next to HTML cells (ref, name, author, status) that hold a link,
// an icon or an avatar around the text.

export interface SupplierProposalAjaxRow {
  rowid: string
  ref: string
  name: string
  date_valid: string
  date_livraison: string
  total_ht: string
  total_ttc: string
  author: string
  status: string
  date_creation: string
}

export interface SupplierProposalAjaxResponse {
  data?: SupplierProposalAjaxRow[]
}

export interface SupplierProposalRow {
  id: number
  ref: string
  vendorId: number | null
  vendor: string
  // The dates as the backend prints them (MM/DD/YYYY), and the same as ISO for sorting.
  validationDate: string
  validationIso: string
  plannedDelivery: string
  plannedDeliveryIso: string
  amountExclTax: number
  amountInclTax: number
  author: string
  status: string
  createdIso: string
}

// "09/24/2026" or "09/24/2026 11:11 AM" -> "2026-09-24"; anything else -> ''.
export function legacySlashDateToIso(value: string): string {
  const m = (value ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}

function fragment(html: string): HTMLElement {
  return new DOMParser().parseFromString(html ?? '', 'text/html').body
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function amount(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function parseSupplierProposalRows(json: SupplierProposalAjaxResponse): SupplierProposalRow[] {
  return (json.data ?? []).map((row) => {
    const vendorLink = fragment(row.name).querySelector('a[href*="socid="]')
    // The name link starts with a coloured initials avatar — drop it to leave just the name.
    const vendorClone = vendorLink?.cloneNode(true) as Element | undefined
    vendorClone?.querySelectorAll('.avatar-circle').forEach((el) => el.remove())
    const socid = vendorLink?.getAttribute('href')?.match(/[?&]socid=(\d+)/)?.[1]

    const statusBody = fragment(row.status)
    return {
      id: Number(row.rowid),
      ref: text(fragment(row.ref).querySelector('a') ?? fragment(row.ref)),
      vendorId: socid ? Number(socid) : null,
      vendor: text(vendorClone) || text(fragment(row.name)),
      validationDate: (row.date_valid ?? '').trim(),
      validationIso: legacySlashDateToIso(row.date_valid),
      plannedDelivery: (row.date_livraison ?? '').trim(),
      plannedDeliveryIso: legacySlashDateToIso(row.date_livraison),
      amountExclTax: amount(row.total_ht),
      amountInclTax: amount(row.total_ttc),
      author: text(fragment(row.author).querySelector('a') ?? fragment(row.author)),
      status: text(statusBody.querySelector('.badge')) || text(statusBody),
      createdIso: legacySlashDateToIso(row.date_creation),
    }
  })
}
