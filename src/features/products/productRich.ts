// A row of the "All Products" report: the columns the JSON list lacks (category, desired / reserved / physical stock,
// ZRA status, classification, country, lot status, avatar colours). Filled from product/fapi/list.php (productListMapper.ts).

export interface RichProductRow {
  id: string
  ref: string
  name: string
  productUrl: string | null
  category: string
  price: string
  // Which price `price` is: the product's own base (the list shows it as "45.00 Inc. Tax" like the classic list).
  priceBaseType: 'HT' | 'TTC'
  stockDesired: number
  stockReserved: number
  stockPhysical: number
  classification: string | null
  zraStatus: string
  vatCode: string
  country: string
  createdDate: string
  // Parsed from createdDate ("17,Jun 2026") for real chronological sorting
  // — 0 when unparseable, never fabricated.
  createdAt: number
  lotStatus: string
  // The legacy row's own colored circular icon badge (background + icon
  // color, e.g. "#e8f0fe" / "#397db9") — carried through as-is so the React
  // list can render the same per-product avatar instead of a flat icon.
  avatarBg: string | null
  avatarColor: string | null
}
