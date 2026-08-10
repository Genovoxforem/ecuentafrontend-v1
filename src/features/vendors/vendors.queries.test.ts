import { describe, expect, it } from 'vitest'
import { toRow } from './vendors.queries'

describe('vendors toRow', () => {
  it('always reports nature "Vendor", regardless of the raw customer type', () => {
    const base = { id: 1, name: 'Acme Supplies', code_client: 'V001', email: '', phone: '', tpin: null, is_supplier: 1 } as const
    expect(toRow({ ...base, type: 'customer' }).nature).toBe('Vendor')
    expect(toRow({ ...base, type: 'prospect' }).nature).toBe('Vendor')
    expect(toRow({ ...base, type: 'customer_prospect' }).nature).toBe('Vendor')
  })

  it('carries name and trackingId through, and falls back to empty string for a null tpin', () => {
    const row = toRow({ id: 1, name: 'Acme Supplies', code_client: 'V001', email: 'a@acme.test', phone: '123', tpin: null, type: 'customer', is_supplier: 1 })
    expect(row.name).toBe('Acme Supplies')
    expect(row.trackingId).toBe('V001')
    expect(row.tpin).toBe('')
  })
})
