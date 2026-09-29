import { describe, expect, it } from 'vitest'
import { legacySlashDateToIso, parseSupplierProposalRows, type SupplierProposalAjaxRow } from './supplierProposalListParser'

// Cell markup copied from a real supplier_proposal_ajax.php response (tooltip
// attributes trimmed).
const draftRow: SupplierProposalAjaxRow = {
  rowid: '14',
  ref: '<a href="/supplier_proposal/card.php?id=14" title="tip" class="classfortooltip"><span class="me-1 fas fa-file-signature infobox-supplier_proposal paddingright classfortooltip "></span>(PROV14)</a>',
  name:
    '<div><a href="/comm/card.php?socid=15" data-geo="tip" class="classforajaxtooltip refurl valignmiddle"><div class="avatar-circle" style="background-color: #397db9; width: 32px;">AP</div>Apex</a></div><small style="color: #666; font-size: 0.85em;"></small>',
  date_valid: '',
  date_livraison: '09/25/2026',
  total_ht: '72.50',
  total_ttc: '72.50',
  author: '<a href="/userprofile/index.php?id=1"><span class="me-1 fas fa-user infobox-adherent paddingright " data-geo="ShowUser"></span>vox_admin</a>',
  status: '<span class="badge  badge-status0 badge-status" title="Draft (needs to be validated)">Draft</span>',
  date_creation: '09/24/2026 11:11 AM',
}

const acceptedRow: SupplierProposalAjaxRow = {
  ...draftRow,
  rowid: '3',
  ref: '<a href="/supplier_proposal/card.php?id=3"><span class="fas"></span>RQ2609-0003</a>',
  date_valid: '09/23/2026',
  total_ht: '495.3752',
  total_ttc: '495.38',
  status: '<span class="badge  badge-status4 badge-status" title="Accepted">Accepted</span>',
}

describe('parseSupplierProposalRows', () => {
  it('reads the plain values and strips the link, icon and avatar markup from the cells', () => {
    const [row] = parseSupplierProposalRows({ data: [draftRow] })
    expect(row).toMatchObject({
      id: 14,
      ref: '(PROV14)',
      vendorId: 15,
      vendor: 'Apex',
      validationDate: '',
      plannedDelivery: '09/25/2026',
      plannedDeliveryIso: '2026-09-25',
      amountExclTax: 72.5,
      amountInclTax: 72.5,
      author: 'vox_admin',
      status: 'Draft',
      createdIso: '2026-09-24',
    })
  })

  it('keeps the backend amounts as numbers and the validated date sortable', () => {
    const [row] = parseSupplierProposalRows({ data: [acceptedRow] })
    expect(row.ref).toBe('RQ2609-0003')
    expect(row.amountExclTax).toBeCloseTo(495.3752)
    expect(row.validationIso).toBe('2026-09-23')
    expect(row.status).toBe('Accepted')
  })

  it('returns no rows for an empty or malformed response', () => {
    expect(parseSupplierProposalRows({})).toEqual([])
    expect(parseSupplierProposalRows({ data: [] })).toEqual([])
  })
})

describe('legacySlashDateToIso', () => {
  it('converts MM/DD/YYYY with or without a time, and rejects anything else', () => {
    expect(legacySlashDateToIso('09/24/2026')).toBe('2026-09-24')
    expect(legacySlashDateToIso('09/24/2026 04:41 PM')).toBe('2026-09-24')
    expect(legacySlashDateToIso('')).toBe('')
    expect(legacySlashDateToIso('2026-09-24')).toBe('')
  })
})
