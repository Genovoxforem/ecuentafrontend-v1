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
  ref: string
  productUrl: string | null
  vatCode: string
  price: number
  priceLabel: string
  country: string
  createdDate: string
  zraStatusMessage: string
}

// The real cell is <a>...<div class="d-flex flex-column">NAME<span
// class="small text-muted">Ref: X</span></div></a> — NAME is the div's own
// direct text-node child; without excluding the nested span's text,
// `.textContent` glues them into "NAMERef: X" with no separator.
export function parseUnuploadedProductRow(raw: RawUnuploadedProductRow): UnuploadedProductRow {
  const doc = new DOMParser().parseFromString(raw.product, 'text/html')
  const anchor = doc.querySelector('a')
  const nameContainer = doc.querySelector('.d-flex.flex-column')
  const nameTextNode = nameContainer ? Array.from(nameContainer.childNodes).find((n) => n.nodeType === Node.TEXT_NODE) : null
  const refSpan = doc.querySelector('.text-muted')

  return {
    id: Number(raw.rowid),
    name: (nameTextNode?.textContent ?? anchor?.textContent ?? cellText(raw.product)).trim(),
    ref: (refSpan?.textContent ?? '').replace(/^Ref:\s*/, '').trim(),
    productUrl: anchor?.getAttribute('href') ?? null,
    vatCode: raw.vat || '',
    price: parseAmount(raw.pricedet),
    priceLabel: cellText(raw.pricedet),
    country: raw.country || '',
    createdDate: raw.cdate || '',
    zraStatusMessage: cellText(raw.zrastatus),
  }
}
