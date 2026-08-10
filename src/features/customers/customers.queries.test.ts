import { describe, expect, it } from 'vitest'
import { toRow } from './customers.queries'

const base = {
  id: 1,
  name: 'Jane Doe',
  name_alias: null,
  code_client: 'CU001',
  email: 'jane@example.com',
  phone: '0977000000',
  address: '',
  zip: '',
  town: '',
  tpin: '1234567A',
  currency: 'ZMW',
  client: 1,
  is_supplier: 0,
} as const

describe('customers toRow', () => {
  it('maps type "prospect" to nature "Prospect"', () => {
    expect(toRow({ ...base, type: 'prospect' }).nature).toBe('Prospect')
  })

  it('maps type "customer" and "customer_prospect" to nature "Customer"', () => {
    expect(toRow({ ...base, type: 'customer' }).nature).toBe('Customer')
    expect(toRow({ ...base, type: 'customer_prospect' }).nature).toBe('Customer')
  })

  it('carries name/email/phone/tpin through unchanged', () => {
    const row = toRow({ ...base, type: 'customer' })
    expect(row.name).toBe('Jane Doe')
    expect(row.email).toBe('jane@example.com')
    expect(row.phone).toBe('0977000000')
    expect(row.tpin).toBe('1234567A')
    expect(row.trackingId).toBe('CU001')
  })

  it('falls back to empty string when tpin/code_client are null', () => {
    const row = toRow({ ...base, type: 'customer', tpin: null, code_client: null })
    expect(row.tpin).toBe('')
    expect(row.trackingId).toBe('')
  })

  it('always reports status "Active" and zero for fields this endpoint does not return', () => {
    const row = toRow({ ...base, type: 'customer' })
    expect(row.status).toBe('Active')
    expect(row.country).toBe('')
    expect(row.outstandingBalance).toBe(0)
    expect(row.salesRep).toBe('')
    expect(row.creationDate).toBe('')
  })
})
