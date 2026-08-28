import { describe, expect, it } from 'vitest'
import { toThirdPartyRow } from './customers.queries'
import type { SocieteListRow } from './societeListParser'

const base: SocieteListRow = {
  socid: 2027,
  name: 'Jane Doe',
  country: 'Zambia',
  currency: 'ZMW',
  outstandingBalance: 0,
  tpin: '1234567A',
  salesRep: '',
  email: 'jane@example.com',
  phone: '0977000000',
  isCustomer: true,
  isProspect: false,
  isVendor: false,
  trackingId: 'CU001',
  creatorName: 'Voxforem Admin',
  creationDateIso: '2026-04-30T12:49:00.000Z',
  statusLabel: 'Open',
}

describe('customers toThirdPartyRow', () => {
  it('maps isProspect-only to nature "Prospect"', () => {
    expect(toThirdPartyRow({ ...base, isCustomer: false, isProspect: true }).nature).toBe('Prospect')
  })

  it('maps isCustomer-only and isCustomer+isProspect to nature "Customer"/"Customer, Prospect"', () => {
    expect(toThirdPartyRow({ ...base, isCustomer: true, isProspect: false }).nature).toBe('Customer')
    expect(toThirdPartyRow({ ...base, isCustomer: true, isProspect: true }).nature).toBe('Customer, Prospect')
  })

  it('carries name/email/phone/tpin/trackingId through unchanged', () => {
    const row = toThirdPartyRow(base)
    expect(row.name).toBe('Jane Doe')
    expect(row.email).toBe('jane@example.com')
    expect(row.phone).toBe('0977000000')
    expect(row.tpin).toBe('1234567A')
    expect(row.trackingId).toBe('CU001')
  })

  it('maps statusLabel "Open"/"Closed" to status "Active"/"Inactive"', () => {
    expect(toThirdPartyRow({ ...base, statusLabel: 'Open' }).status).toBe('Active')
    expect(toThirdPartyRow({ ...base, statusLabel: 'Closed' }).status).toBe('Inactive')
  })

  it('carries country/balance/salesRep/creatorName through from the parsed row', () => {
    const row = toThirdPartyRow(base)
    expect(row.country).toBe('Zambia')
    expect(row.outstandingBalance).toBe(0)
    expect(row.salesRep).toBe('')
    expect(row.creatorName).toBe('Voxforem Admin')
  })

  it('passes creationDate through as the parsed ISO string, unformatted (ThirdPartyList formats and parses it)', () => {
    expect(toThirdPartyRow(base).creationDate).toBe('2026-04-30T12:49:00.000Z')
  })
})
