// Parses fourn/facture/facture_ajax_list.php's own DataTables rows — every
// cell is server-built HTML (FactureFournisseur::getNomUrl()/LibStatut(),
// Societe::getNomUrl(), hand-built <div>/<small> blocks), not a clean value,
// confirmed by reading that file directly (it's the real backend for the
// "Purchase Invoices" list page, aaData/iTotalRecords shape, not the
// draw/recordsTotal shape some other DataTables endpoints in this app use).
//
// length=-1 returns every row unpaginated (confirmed by reading the file's
// own `if (is_numeric($rowperpage) && $rowperpage != -1)` guard) — same
// "fetch once, compute stats client-side" convention as Contracts/
// Quotations/Warehouse.

function cellText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(text: string): number {
  const n = Number(text.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export interface RawVendorInvoiceListRow {
  ref: string
  ref_vendor: string
  invoice_date: string
  due_date: string
  thirdparty: string
  payment_type: string
  amount: string
  sartycd: string
  regtycd: string
  status: string
  zrastatus: string
}

export interface VendorInvoiceListRow {
  id: number | null
  ref: string
  refUrl: string | null
  refSupplier: string | null
  invoiceDate: string
  dueDate: string
  thirdPartyName: string | null
  thirdPartyUrl: string | null
  thirdPartySubtitle: string
  paymentTypeLabel: string | null
  amountTtc: number
  amountHt: number
  amountVat: number
  saleTypeCode: string | null
  registrationTypeCode: string | null
  statusLabel: string
  paye: boolean
  zraStatus: string | null
}

export function parseVendorInvoiceListRow(raw: RawVendorInvoiceListRow): VendorInvoiceListRow {
  const refDoc = new DOMParser().parseFromString(raw.ref, 'text/html')
  const refAnchor = refDoc.querySelector('a')
  const refHref = refAnchor?.getAttribute('href') ?? null
  const idMatch = refHref?.match(/[?&]facid=(\d+)/) ?? refHref?.match(/[?&]id=(\d+)/)

  const thirdDoc = new DOMParser().parseFromString(raw.thirdparty, 'text/html')
  const thirdAnchor = thirdDoc.querySelector('a')
  const thirdSmall = thirdDoc.querySelector('small')
  // The anchor's own avatar-circle <div> (initials, e.g. "AL") sits before
  // the name text node — strip it before reading textContent or the
  // initials get prepended to the name (same fix as societeListParser.ts).
  thirdAnchor?.querySelector('.avatar-circle')?.remove()

  const amountText = cellText(raw.amount)
  // "500.00 HT: 431.034 | VAT: 68.9654" (whitespace-collapsed) — the first
  // number is the TTC total from the cell's own top-level <div>.
  const amountMainMatch = amountText.match(/^([\d.,\s-]+)/)
  const htMatch = amountText.match(/HT:\s*([\d.,-]+)/)
  const vatMatch = amountText.match(/VAT:\s*([\d.,-]+)/)

  const statusText = cellText(raw.status)
  const paye = /\bpaid\b/i.test(statusText) && !/not\s*paid/i.test(statusText)

  const sartycd = cellText(raw.sartycd)
  const regtycd = cellText(raw.regtycd)

  return {
    id: idMatch ? Number(idMatch[1]) : null,
    ref: cellText(raw.ref),
    refUrl: refHref,
    refSupplier: raw.ref_vendor?.trim() || null,
    invoiceDate: cellText(raw.invoice_date).split('Due:')[0]?.trim() ?? '',
    dueDate: cellText(raw.due_date),
    thirdPartyName: (thirdAnchor?.textContent ?? cellText(raw.thirdparty)).trim() || null,
    thirdPartyUrl: thirdAnchor?.getAttribute('href') ?? null,
    thirdPartySubtitle: (thirdSmall?.textContent ?? '').trim(),
    paymentTypeLabel: cellText(raw.payment_type) || null,
    amountTtc: parseAmount(amountMainMatch?.[1] ?? '0'),
    amountHt: parseAmount(htMatch?.[1] ?? '0'),
    amountVat: parseAmount(vatMatch?.[1] ?? '0'),
    saleTypeCode: sartycd && sartycd !== '-' ? sartycd : null,
    registrationTypeCode: regtycd && regtycd !== '-' ? regtycd : null,
    statusLabel: statusText.split('Currency:')[0]?.trim() ?? statusText,
    paye,
    zraStatus: cellText(raw.zrastatus) || null,
  }
}
