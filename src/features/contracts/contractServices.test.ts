import { describe, expect, it } from 'vitest'
import { toContractServiceRow, type RawServiceLine } from './contracts.queries'

// Line shape as contrat/api/services_list_api.php?action=list returns it (172.16.5.10).
const line = (over: Partial<RawServiceLine> = {}): RawServiceLine => ({
  lineId: 3,
  contractId: 3,
  contractRef: 'CT2604-0003',
  service: 'S02 - Ecuenta Application',
  thirdParty: 'Meriba traders',
  thirdPartyId: 1994,
  plannedStart: '04/27/2026',
  realStart: '04/27/2026',
  plannedEnd: '04/30/2027',
  realEnd: '',
  statut: 4,
  statusLabel: 'Running',
  ...over,
})
const now = new Date(2026, 9, 5)

describe('toContractServiceRow', () => {
  it('splits the product ref from its label and keeps the other columns', () => {
    expect(toContractServiceRow(line(), new Set(), now)).toEqual({
      contractId: 3,
      contractRef: 'CT2604-0003',
      serviceRef: 'S02',
      service: 'Ecuenta Application',
      vendorOrCustomerId: 1994,
      thirdParty: 'Meriba traders',
      plannedStart: '04/27/2026',
      realStart: '04/27/2026',
      plannedEnd: '04/30/2027',
      realEnd: '',
      status: 'Not expired',
    })
  })

  it('uses the legacy page status labels', () => {
    expect(toContractServiceRow(line({ statut: 0, statusLabel: 'Initial' }), new Set(), now).status).toBe('Not running')
    expect(toContractServiceRow(line({ plannedEnd: '09/30/2026' }), new Set(), now).status).toBe('Expired')
    expect(toContractServiceRow(line({ plannedEnd: '' }), new Set(), now).status).toBe('Not expired')
    expect(toContractServiceRow(line({ statut: 5 }), new Set(), now).status).toBe('Closed')
  })

  it('reads "Draft" for every line of a draft contract', () => {
    expect(toContractServiceRow(line({ statut: 0 }), new Set([3]), now).status).toBe('Draft')
  })
})
