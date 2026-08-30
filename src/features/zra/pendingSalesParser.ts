// Parses compta/facture/invoice_ajax_list.php's own DataTables rows (real,
// confirmed by reading that file directly) — same aaData/iTotalRecords
// shape as fourn/facture/facture_ajax_list.php (see
// vendorInvoiceListParser.ts), but with oddly-misnamed keys left over from
// a copy-pasted template (cust_name actually holds the ref link,
// typent_code actually holds the third-party link, etc. — confirmed
// against the file's own $ax/$ae variable assignments, not guessed).

function cellText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(text: string): number {
  const n = Number(text.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export interface RawPendingSalesRow {
  cust_name: string
  invoiceno: string
  currency: string
  labelcountry: string
  typent_code: string
  contact: string
  cust_type: string
  entity: string
  tot_amount: string
  author: string
  status: string
  zrastatus: string
}

export interface PendingSalesRow {
  id: number | null
  ref: string
  invoiceDate: string
  dueDate: string | null
  thirdParty: string
  city: string | null
  paymentType: string | null
  paymentTerms: string | null
  amountExclTax: number
  vat: number
  amountInclTax: number
  author: string
  status: string
  zraSucceeded: boolean
  zraStatusMessage: string
}

export function parsePendingSalesRow(raw: RawPendingSalesRow): PendingSalesRow {
  const refDoc = new DOMParser().parseFromString(raw.cust_name, 'text/html')
  const refHref = refDoc.querySelector('a')?.getAttribute('href') ?? null
  const idMatch = refHref?.match(/[?&]facid=(\d+)/) ?? refHref?.match(/[?&]id=(\d+)/)

  const amountText = cellText(raw.tot_amount)
  const htMatch = amountText.match(/HT:\s*([\d.,-]+)/)
  const vatMatch = amountText.match(/VAT:\s*([\d.,-]+)/)
  const mainMatch = amountText.match(/^([\d.,\s-]+)/)

  const paymentTypeText = cellText(raw.cust_type)
  const zraText = cellText(raw.zrastatus)

  return {
    id: idMatch ? Number(idMatch[1]) : null,
    ref: cellText(raw.cust_name),
    invoiceDate: cellText(raw.currency).split('Due:')[0]?.trim() ?? '',
    dueDate: raw.labelcountry && raw.labelcountry !== '-' ? cellText(raw.labelcountry) : null,
    thirdParty: cellText(raw.typent_code),
    city: raw.contact || null,
    paymentType: paymentTypeText.split('\n')[0]?.trim() || null,
    paymentTerms: raw.entity && raw.entity !== '-' ? raw.entity : null,
    amountExclTax: parseAmount(htMatch?.[1] ?? '0'),
    vat: parseAmount(vatMatch?.[1] ?? '0'),
    amountInclTax: parseAmount(mainMatch?.[1] ?? '0'),
    author: cellText(raw.author),
    status: cellText(raw.status).split('Currency:')[0]?.trim() ?? '',
    zraSucceeded: /succeeded/i.test(zraText),
    zraStatusMessage: zraText,
  }
}
