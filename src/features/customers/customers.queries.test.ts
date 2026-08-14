import { describe, expect, it } from 'vitest'
import { toRow } from './customers.queries'

const base = {
  id: 1,
  name: 'Jane Doe',
  tpin: '1234567A',
  trackingId: 'CU001',
  isCustomer: true,
  isProspect: false,
  isVendor: false,
  statusLabel: 'Open' as const,
  email: 'jane@example.com',
  phone: '0977000000',
  countryLabel: 'Zambia',
  currencyCode: 'ZMW',
  outstandingBalance: 0,
  salesReps: '',
  createdAt: '2026-04-30 12:49:00',
  creatorName: 'Voxforem Admin',
}

describe('customers toRow', () => {
  it('maps isProspect-only to nature "Prospect"', () => {
    expect(toRow({ ...base, isCustomer: false, isProspect: true }).nature).toBe('Prospect')
  })

  it('maps isCustomer-only and isCustomer+isProspect to nature "Customer"/"Customer, Prospect"', () => {
    expect(toRow({ ...base, isCustomer: true, isProspect: false }).nature).toBe('Customer')
    expect(toRow({ ...base, isCustomer: true, isProspect: true }).nature).toBe('Customer, Prospect')
  })

  it('carries name/email/phone/tpin/trackingId through unchanged', () => {
    const row = toRow(base)
    expect(row.name).toBe('Jane Doe')
    expect(row.email).toBe('jane@example.com')
    expect(row.phone).toBe('0977000000')
    expect(row.tpin).toBe('1234567A')
    expect(row.trackingId).toBe('CU001')
  })

  it('falls back to empty string when tpin/trackingId are null', () => {
    const row = toRow({ ...base, tpin: null, trackingId: null })
    expect(row.tpin).toBe('')
    expect(row.trackingId).toBe('')
  })

  it('maps statusLabel "Open"/"Closed" to status "Active"/"Inactive"', () => {
    expect(toRow({ ...base, statusLabel: 'Open' }).status).toBe('Active')
    expect(toRow({ ...base, statusLabel: 'Closed' }).status).toBe('Inactive')
  })

  it('carries country/balance/salesRep/creatorName through from the list endpoint', () => {
    const row = toRow(base)
    expect(row.country).toBe('Zambia')
    expect(row.outstandingBalance).toBe(0)
    expect(row.salesRep).toBe('')
    expect(row.creatorName).toBe('Voxforem Admin')
  })

  it('passes creationDate through raw, unformatted (ThirdPartyList formats and parses it)', () => {
    expect(toRow(base).creationDate).toBe('2026-04-30 12:49:00')
  })
})
