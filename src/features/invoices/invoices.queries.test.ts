import { describe, expect, it } from 'vitest'
import { toRow } from './invoices.queries'

describe('invoices toRow', () => {
  it('maps a validated, unpaid invoice to a row that allows recording payment', () => {
    const row = toRow({
      id: 42,
      ref: 'INV-042',
      date: '2026-08-01',
      thirdparty_name: 'Acme Ltd',
      total_ttc: 1234.5,
      status_label: 'Unpaid',
      statut: 1,
      zra_sdc: null,
    })

    expect(row).toEqual({
      id: 42,
      ref: 'INV-042',
      invoiceNo: 'INV-042',
      invoiceDate: '2026-08-01',
      thirdParty: 'Acme Ltd',
      city: '',
      paymentType: '',
      author: '',
      amountInclTax: 1234.5,
      status: 'Unpaid',
      zraStatus: '',
      canRecordPayment: true,
    })
  })

  it('only allows recording payment when statut is exactly 1 (validated)', () => {
    expect(toRow({ id: 1, ref: '', date: '', thirdparty_name: '', total_ttc: 0, status_label: 'Draft', statut: 0, zra_sdc: null }).canRecordPayment).toBe(false)
    expect(toRow({ id: 1, ref: '', date: '', thirdparty_name: '', total_ttc: 0, status_label: 'Paid', statut: 2, zra_sdc: null }).canRecordPayment).toBe(false)
  })

  it('reads the ZRA upload status when present, blank otherwise', () => {
    const withZra = toRow({ id: 1, ref: '', date: '', thirdparty_name: '', total_ttc: 0, status_label: 'Paid', statut: 1, zra_sdc: { upload_status: 'uploaded' } })
    expect(withZra.zraStatus).toBe('uploaded')

    const withoutZra = toRow({ id: 1, ref: '', date: '', thirdparty_name: '', total_ttc: 0, status_label: 'Paid', statut: 1, zra_sdc: null })
    expect(withoutZra.zraStatus).toBe('')
  })

  it('falls back to empty/zero when the backend omits ref/amount despite the declared shape', () => {
    // The real backend doesn't always honor RawInvoice's non-nullable types —
    // toRow() guards every field with `??` for exactly this reason. Cast
    // needed here since TS itself wouldn't let a well-typed caller pass null.
    const row = toRow({ id: 1, date: '', thirdparty_name: '', total_ttc: null, status_label: '', statut: 0, zra_sdc: null } as unknown as Parameters<typeof toRow>[0])
    expect(row.ref).toBe('')
    expect(row.invoiceNo).toBe('')
    expect(row.amountInclTax).toBe(0)
  })
})
