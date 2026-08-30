// Parses product/allproducts_ajax.php's own DataTables rows (real,
// confirmed by reading that file directly) with zrastatus=unupload —
// filters WHERE p.zracode != '000' OR p.zracode IS NULL, matching the real
// "Un-uploaded Products/services" page exactly. This page never had a
// backend built for it before (not even on the old ecnta10 instance — see
// UnuploadProductsList.tsx's own prior comment), so this is a fresh build,
// not a "swap the dead endpoint" fix like the rest of this module.

function cellText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(text: string): number {
  const n = Number(text.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export interface RawUnuploadedProductRow {
  rowid: string
  product: string
  category: string
  pricedet: string
  classification: string
  zrastatus: string
  vat: string
  country: string
  cdate: string
  lotstatus: string
}

export interface UnuploadedProductRow {
  id: number
  name: string
  productUrl: string | null
  vatCode: string
  price: number
  priceLabel: string
  country: string
  createdDate: string
  zraStatusMessage: string
}

export function parseUnuploadedProductRow(raw: RawUnuploadedProductRow): UnuploadedProductRow {
  const doc = new DOMParser().parseFromString(raw.product, 'text/html')
  const anchor = doc.querySelector('a')

  return {
    id: Number(raw.rowid),
    name: (anchor?.textContent ?? cellText(raw.product)).trim(),
    productUrl: anchor?.getAttribute('href') ?? null,
    vatCode: raw.vat || '',
    price: parseAmount(raw.pricedet),
    priceLabel: cellText(raw.pricedet),
    country: raw.country || '',
    createdDate: raw.cdate || '',
    zraStatusMessage: cellText(raw.zrastatus),
  }
}
