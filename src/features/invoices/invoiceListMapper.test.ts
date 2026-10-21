import { describe, expect, it } from 'vitest'
import type { InvoiceRow as FapiInvoiceRow } from '../../api/invoices'
import { fapiInvoiceToRow, type InvoiceListLookups } from './invoiceListMapper'

// Rows of compta/facture/fapi/list.php as 172.16.5.10 returns them.
const base: FapiInvoiceRow = {
  id: 346,
  ref: 'INOV-26-0035',
  ref_client: '',
  type: 0,
  fk_soc: 10,
  third_party_name: 'David',
  third_party_alias: '',
  third_party_email: '',
  third_party_town: '',
  third_party_zip: '',
  third_party_country: 'ZM',
  third_party_code: 'CU2503-00004',
  typent_code: 'TE_UNKNOWN',
  state_name: '',
  invoice_date: '2026-10-04',
  date_valid: '2026-10-04',
  due_date: '2026-10-05',
  date_creation: '2026-10-04 14:56:53',
  date_update: '2026-10-04 20:26:54',
  total_ht: 70,
  total_vat: 0,
  total_ttc: 70,
  localtax1: 0,
  localtax2: 0,
  fk_statut: 1,
  paye: 0,
  status_label: 'Not paid',
  close_code: null,
  fk_mode_reglement: 1,
  fk_cond_reglement: 1,
  author_login: 'vox_admin',
  author_firstname: 'Voxforem',
  author_lastname: 'Admin',
  author_photo: 'fin512.jpg',
  multicurrency_code: 'ZMW',
  multicurrency_tx: 1,
  multicurrency_total_ht: 70,
  multicurrency_total_vat: 0,
  multicurrency_total_ttc: 70,
  project_id: null,
  project_ref: null,
  project_label: null,
  module_source: null,
  pos_source: null,
  zra_upload_status: 'It is succeeded',
  zra_upload_response:
    '{"rcptNo":5317,"intrlData":"I6H7EAWI6NF3TXRECQLK2N5LBY","rcptSign":"EU24KDP6C5E5MVUF","sdcId":"SDC0010002115","mrcNo":"WIS00003036  ","qrCodeUrl":"https:\\/\\/sandboxportal.zra.org.zm\\/indexInvoiceData?Data=2486760171000EU24KDP6C5E5MVUF"}',
  zra_upload_error: '000',
  has_child_invoices: 0,
  note_private: null,
  note_public: null,
}
const lookups: InvoiceListLookups = {
  paymentModes: new Map([[1, 'Cash']]),
  users: new Map([['vox_admin', { id: 1, photo: '/viewimage.php?modulepart=userphoto&entity=0&file=1/photos/fin512.jpg' }]]),
}
const map = (over: Partial<FapiInvoiceRow> = {}, l: InvoiceListLookups = lookups) => fapiInvoiceToRow({ ...base, ...over }, l)

describe('fapiInvoiceToRow', () => {
  it('maps an unpaid invoice the way the classic list prints it', () => {
    expect(map()).toMatchObject({
      id: 346,
      ref: 'INOV-26-0035',
      invoiceNo: 'INV0010002115/5317',
      invoiceDate: '2026-10-04',
      invoiceDateLabel: '10/04/2026',
      dueDate: '10/05/2026',
      thirdParty: 'David',
      socid: 10,
      paymentType: 'Cash',
      amountInclTax: 70,
      amountHt: '70.00',
      vatAmount: '0.00',
      author: 'Voxforem Admin',
      authorId: 1,
      currency: 'ZMW',
      status: 'Unpaid',
      statusLabel: 'Not paid',
      rawStatut: 1,
      canRecordPayment: true,
      zraStatus: 'Succeeded',
      zraQrUrl: 'https://sandboxportal.zra.org.zm/indexInvoiceData?Data=2486760171000EU24KDP6C5E5MVUF',
    })
  })

  it('reads draft, paid and abandoned invoices from the status code', () => {
    expect(map({ fk_statut: 0, status_label: 'Draft' })).toMatchObject({ status: 'Draft', rawStatut: 0, canRecordPayment: false })
    expect(map({ fk_statut: 2, paye: 1, status_label: 'Paid' })).toMatchObject({ status: 'Paid', rawStatut: 2, canRecordPayment: false })
    // IN-V-26-0001 on 172.16.5.10 — the classic list printed it as "Closed".
    expect(map({ fk_statut: 3, status_label: 'Abandoned', close_code: 'badcustomer' })).toMatchObject({ status: 'Abandoned', statusLabel: 'Abandoned', rawStatut: 3, canRecordPayment: false })
  })

  it('keeps an invoice closed without being paid in full with the unpaid ones, worded "Closed"', () => {
    // IN-V-26-0095 on 172.16.5.10 (status 2, not paid) — not abandoned.
    expect(map({ fk_statut: 2, paye: 0, status_label: 'Paid' })).toMatchObject({ status: 'Unpaid', statusLabel: 'Closed', rawStatut: 1 })
  })

  it('prints amounts with thousands separators and 2 to 4 decimals', () => {
    const row = map({ total_ht: 5171.669, total_vat: 827.467 })
    expect(row).toMatchObject({ amountHt: '5,171.669', vatAmount: '827.467' })
    expect(map({ total_ht: 3000, total_vat: 0 })).toMatchObject({ amountHt: '3,000.00', vatAmount: '0.00' })
    expect(map({ total_ht: -94.8266, total_vat: 474.138 })).toMatchObject({ amountHt: '-94.8266', vatAmount: '474.138' })
  })

  it('degrades quietly when the ZRA response or a lookup is missing', () => {
    const row = map({ zra_upload_response: null, zra_upload_error: null, fk_mode_reglement: 0, author_firstname: '', author_lastname: '' }, { paymentModes: new Map(), users: new Map() })
    expect(row).toMatchObject({ invoiceNo: '', zraQrUrl: '', zraStatus: 'Error', paymentType: '', author: 'vox_admin', authorId: null, authorPhoto: '' })
    expect(map({ zra_upload_response: 'not json' }).invoiceNo).toBe('')
  })
})
