// Shapes the product stock, statistics and detail screens render. They are filled from product/fapi and
// product/stock/fapi (productTools.queries.ts, products.queries.ts); nothing here parses HTML any more.

export interface StockByLotRow {
  productId: string | null
  ref: string
  label: string
  cardUrl: string | null
  warehouse: string
  lotSerial: string
  eatByDate: string
  sellByDate: string
  physicalStock: number
  movementsUrl: string | null
  forSale: string
  forPurchase: string
  avatarBg: string | null
  avatarColor: string | null
}

export interface ProductStatSeries {
  label: string
  total: number
  monthly: number[]
}

export interface ProductDetailPanel {
  kind: 'product' | 'service'
  // Literal `$object->zracode === '000'` check from load_product_image.php
  // (picks the green icon / "badge-status3" blinking dot vs orange /
  // "badge-status1") — named after the condition itself since the exact
  // real-world meaning of zracode wasn't independently confirmed elsewhere.
  zraCodeIsDefault: boolean
  ref: string
  label: string
  zraProductCode: string
  priceInclTax: string
  rrp: string
  classificationCode: string
  images: { thumbUrl: string; fullUrl: string }[]
  warehouseStock: { warehouse: string; warehouseUrl: string | null; quantity: number }[]
  totalStock: number
  notFound: boolean
}

export interface ProductLinkRow {
  id: number
  label: string
  url: string
  date: string
}

export interface ProductDocumentRow {
  fileName: string
  fileUrl: string | null
  size: string
  /** Size in bytes (the "size" text is "1176 Kb"); the total of the tab adds these. */
  sizeBytes?: number
  date: string
}
