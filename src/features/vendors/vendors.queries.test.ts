import { describe, expect, it } from 'vitest'
import { toRow } from './vendors.queries'

const base = {
  id: 1,
  name: 'Acme Supplies',
  tpin: null,
  trackingId: 'V001',
  isCustomer: false,
  isProspect: false,
  isVendor: true,
  statusLabel: 'Open' as const,
  email: 'a@acme.test',
  phone: '123',
  countryLabel: 'Zambia',
  currencyCode: 'ZMW',
  outstandingBalance: 0,
  salesReps: '',
  createdAt: '2026-04-30 12:49:00',
  creatorName: 'Voxforem Admin',
}

describe('vendors toRow', () => {
  it('reports nature "Vendor", or "Vendor, Customer" when also flagged as a customer', () => {
    expect(toRow({ ...base, isCustomer: false }).nature).toBe('Vendor')
    expect(toRow({ ...base, isCustomer: true }).nature).toBe('Vendor, Customer')
  })

  it('carries name and trackingId through, and falls back to empty string for a null tpin', () => {
    const row = toRow(base)
    expect(row.name).toBe('Acme Supplies')
    expect(row.trackingId).toBe('V001')
    expect(row.tpin).toBe('')
  })
})
