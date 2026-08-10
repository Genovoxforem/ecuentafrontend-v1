import { describe, expect, it } from 'vitest'
import { toRow } from './products.queries'

const base = {
  id: 7,
  ref: 'PRD-007',
  label: 'Widget',
  price: 100,
  price_ttc: 116,
  tva_tx: '16',
  stock: 50,
  barcode: '012345',
} as const

describe('products toRow', () => {
  it('maps fk_product_type 1 to "service" and anything else to "product"', () => {
    expect(toRow({ ...base, fk_product_type: 1 }).type).toBe('service')
    expect(toRow({ ...base, fk_product_type: 0 }).type).toBe('product')
  })

  it('coerces string price/stock fields to numbers', () => {
    const row = toRow({ ...base, fk_product_type: 0, price: '199.99', price_ttc: '231.99', stock: '12' })
    expect(row.priceExclTax).toBe(199.99)
    expect(row.priceInclTax).toBe(231.99)
    expect(row.stock).toBe(12)
  })

  it('stringifies a numeric id', () => {
    expect(toRow({ ...base, fk_product_type: 0, id: 7 }).id).toBe('7')
  })

  it('carries ref/label/vatRate/barcode through unchanged', () => {
    const row = toRow({ ...base, fk_product_type: 0 })
    expect(row.ref).toBe('PRD-007')
    expect(row.label).toBe('Widget')
    expect(row.vatRate).toBe('16')
    expect(row.barcode).toBe('012345')
  })
})
