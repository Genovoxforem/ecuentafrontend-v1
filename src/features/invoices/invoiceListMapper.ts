import type { InvoiceRow as FapiInvoiceRow } from '../../api/invoices'
import type { InvoiceRow } from './invoices.queries'

// Maps a row of compta/facture/fapi/list.php onto the row shape the Sales
// Invoices screens render (they were built on the classic list's
// invoice_ajax_list.php, whose cells are HTML). Every field is reproduced the
// way that classic list prints it, so the screens look the same; the mapping was
// checked against all 294 invoices of 172.16.5.10 (see invoiceListMapper.test.ts).

export interface InvoiceListLookups {
  // c_paiement: fk_mode_reglement -> label ("Cash", "Credit", …).
  paymentModes: ReadonlyMap<number, string>
  // User login (lower case) -> id and photo URL, from userprofile/api/users.php.
  users: ReadonlyMap<string, { id: number; photo: string }>
}

// The avatar colour the classic list's third-party cell gives a customer
// (societe.class.php: client > 0 -> #397db9) — every sales invoice's third party.
const CUSTOMER_AVATAR_COLOR = '#397db9'

// "2026-05-18" -> "05/18/2026", the classic screen's own date format.
function toUsDate(iso: string | null): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

// The classic list prints the stored amount with thousands separators, at least
// 2 and at most 4 decimals: 5,171.669, 3,000.00, 474.138, -94.8266.
function formatAmount(n: number): string {
  const [whole, fraction = ''] = n.toFixed(4).split('.')
  const decimals = fraction.replace(/0+$/, '').padEnd(2, '0')
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimals}`
}

// What the ZRA gateway answered, stored as JSON on the invoice.
function zraResponse(raw: string | null): { sdcId?: string; rcptNo?: string | number; qrCodeUrl?: string } {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as { sdcId?: string; rcptNo?: string | number; qrCodeUrl?: string }) : {}
  } catch {
    return {}
  }
}

export function fapiInvoiceToRow(item: FapiInvoiceRow, lookups: InvoiceListLookups): InvoiceRow {
  const zra = zraResponse(item.zra_upload_response)
  // The classic list builds this as the SDC id with "SDC" swapped for "INV",
  // "/", then the receipt number — for every invoice type, credit notes included.
  const invoiceNo = zra.sdcId && zra.rcptNo != null ? `${zra.sdcId.replace('SDC', 'INV')}/${zra.rcptNo}` : ''
  const user = lookups.users.get((item.author_login ?? '').toLowerCase())
  const fullName = `${item.author_firstname ?? ''} ${item.author_lastname ?? ''}`.trim()

  // Draft / abandoned / paid / still owing. A status-2 invoice closed without
  // being paid in full ("Closed (unpaid)") is neither paid nor abandoned: it
  // stays with the unpaid ones, as the classic list treats it.
  let status = 'Unpaid'
  let rawStatut = 1
  if (item.fk_statut === 0) {
    status = 'Draft'
    rawStatut = 0
  } else if (item.fk_statut === 3) {
    status = 'Abandoned'
    rawStatut = 3
  } else if (item.paye) {
    status = 'Paid'
    rawStatut = 2
  }

  // The classic wording for an invoice closed without being paid in full.
  const statusLabel = item.fk_statut === 2 && !item.paye ? 'Closed' : item.status_label

  return {
    id: item.id,
    ref: item.ref,
    invoiceNo,
    invoiceDate: item.invoice_date?.slice(0, 10) ?? '',
    invoiceDateLabel: toUsDate(item.invoice_date),
    dueDate: toUsDate(item.due_date),
    thirdParty: item.third_party_name,
    socid: item.fk_soc || null,
    thirdPartyColor: CUSTOMER_AVATAR_COLOR,
    city: item.third_party_town ?? '',
    paymentType: lookups.paymentModes.get(item.fk_mode_reglement) ?? '',
    amountInclTax: item.total_ttc,
    amountHt: formatAmount(item.total_ht),
    vatAmount: formatAmount(item.total_vat),
    author: fullName || item.author_login || '',
    authorId: user?.id ?? null,
    authorPhoto: user?.photo ?? '',
    status,
    statusLabel,
    currency: item.multicurrency_code ?? '',
    zraStatus: item.zra_upload_error === '000' ? 'Succeeded' : 'Error',
    zraQrUrl: zra.qrCodeUrl ?? '',
    // Only invoices that still owe money can take a payment.
    canRecordPayment: status === 'Unpaid',
    rawStatut,
  }
}
