import { describe, expect, it } from 'vitest'
import { toThirdPartyRow } from './vendors.queries'
import type { SocieteListRow } from '../customers/societeListParser'

const base: SocieteListRow = {
  socid: 1990,
  name: 'Abinav Traders',
  country: 'India',
  currency: 'INR',
  outstandingBalance: 214405.12,
  tpin: '1000000000',
  salesRep: '',
  email: '',
  phone: '1212222126',
  isCustomer: false,
  isProspect: false,
  isVendor: true,
  trackingId: 'V001',
  creatorName: 'Voxforem Admin',
  creationDateIso: '2026-04-30T12:49:00.000Z',
  statusLabel: 'Open',
}

describe('vendors toThirdPartyRow', () => {
  it('reports nature "Vendor", or "Vendor, Customer" when also flagged as a customer', () => {
    expect(toThirdPartyRow({ ...base, isCustomer: false }).nature).toBe('Vendor')
    expect(toThirdPartyRow({ ...base, isCustomer: true }).nature).toBe('Vendor, Customer')
  })

  it('carries name and trackingId through, and passes tpin through unchanged', () => {
    const row = toThirdPartyRow(base)
    expect(row.name).toBe('Abinav Traders')
    expect(row.trackingId).toBe('V001')
    expect(row.tpin).toBe('1000000000')
  })

  it('maps statusLabel "Open"/"Closed" to status "Active"/"Inactive"', () => {
    expect(toThirdPartyRow({ ...base, statusLabel: 'Open' }).status).toBe('Active')
    expect(toThirdPartyRow({ ...base, statusLabel: 'Closed' }).status).toBe('Inactive')
  })

  it('carries country/balance/creatorName through from the parsed row', () => {
    const row = toThirdPartyRow(base)
    expect(row.country).toBe('India')
    expect(row.outstandingBalance).toBe(214405.12)
    expect(row.creatorName).toBe('Voxforem Admin')
  })
})
