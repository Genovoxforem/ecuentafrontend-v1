import { parseAmount } from '../../utils/text'
import { cellTooltip, tooltipValue, type LegacyTooltip } from '../../shared/legacyTooltip'
// Parses compta/facture/invoice_ajax_list.php's own DataTables rows — same aaData/iTotalRecords shape as
// fourn/facture/facture_ajax_list.php (see vendorInvoiceListParser.ts), but with misnamed keys left over from a
// copy-pasted template (cust_name holds the ref link, typent_code the third-party link, currency the invoice date, etc.).
// Several cells are two lines (a value, then a `<br><small>` note: "ref: POS1-0", "Due: …", the payment terms,
// "Currency: ZMW") and the third-party / author links start with an initials avatar, so cells are read by their
// parts, never as one flattened string ("EPOS-26-0001ref: POS1-0", "WWalking").

const parse = (html: string) => new DOMParser().parseFromString(html ?? '', 'text/html').body
const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

function cellText(html: string): string {
  return clean(parse(html).textContent)
}

// The link a cell's anchor points at (a classic .php page; the list maps it to a React route).
const hrefOf = (html: string) => parse(html).querySelector('a')?.getAttribute('href') ?? null
// The initials avatar a third-party / user link starts with ("W", "VV").
const initialsOf = (html: string) => clean(parse(html).querySelector('.avatar, .userimg')?.textContent)

// The cell without its avatar and its trailing <small> note, and that note on its own.
function mainAndNote(html: string): { main: string; note: string } {
  const body = parse(html)
  body.querySelectorAll('.avatar, .userimg').forEach((el) => el.remove())
  const small = body.querySelector('small')
  const note = clean(small?.textContent)
  small?.remove()
  return { main: clean(body.textContent), note }
}

export interface RawPendingSalesRow {
  cust_name: string
  invoiceno: string
  currency: string
  labelcountry: string
  typent_code: string
  contact: string
  cust_type: string
  entity: string
  tot_amount: string
  author: string
  status: string
  zrastatus: string
}

export interface PendingSalesRow {
  id: number | null
  ref: string
  // The second line under the ref ("ref: POS1-0"), empty when there is none.
  refNote: string
  refHref: string | null
  refTip: LegacyTooltip | null
  invoiceDate: string
  dueDate: string | null
  thirdParty: string
  thirdPartyHref: string | null
  thirdPartyInitials: string
  // From the third-party tooltip ("Customer Code: CU2412-00001"); the cell itself does not print it.
  thirdPartyCode: string
  thirdPartyTip: LegacyTooltip | null
  city: string | null
  paymentType: string | null
  paymentTerms: string | null
  amountExclTax: number
  vat: number
  amountInclTax: number
  author: string
  authorHref: string | null
  authorInitials: string
  authorTip: LegacyTooltip | null
  status: string
  // "ZMW", from the status cell's "Currency: ZMW" line.
  currency: string
  zraSucceeded: boolean
  zraStatusMessage: string
  // The ref the status cell's own refresh button passes to fnupdatezrainvoice(ref), when the backend prints one.
  zraRefreshRef: string | null
}

export function parsePendingSalesRow(raw: RawPendingSalesRow): PendingSalesRow {
  const refHref = hrefOf(raw.cust_name)
  const idMatch = refHref?.match(/[?&]facid=(\d+)/) ?? refHref?.match(/[?&]id=(\d+)/)
  const ref = mainAndNote(raw.cust_name)

  const amountText = cellText(raw.tot_amount)
  const htMatch = amountText.match(/HT:\s*([\d.,-]+)/)
  const vatMatch = amountText.match(/VAT:\s*([\d.,-]+)/)
  const mainMatch = amountText.match(/^([\d.,\s-]+)/)

  const payment = mainAndNote(raw.cust_type)
  const status = mainAndNote(raw.status)
  const zraText = cellText(raw.zrastatus)
  // Plain text in the answer, but a blank one comes as the HTML entity &nbsp;.
  const terms = cellText(raw.entity)
  const thirdPartyTip = cellTooltip(raw.typent_code)

  return {
    id: idMatch ? Number(idMatch[1]) : null,
    ref: ref.main,
    refNote: ref.note,
    refHref,
    refTip: cellTooltip(raw.cust_name),
    invoiceDate: mainAndNote(raw.currency).main,
    dueDate: raw.labelcountry && raw.labelcountry !== '-' ? cellText(raw.labelcountry) : null,
    thirdParty: mainAndNote(raw.typent_code).main,
    thirdPartyHref: hrefOf(raw.typent_code),
    thirdPartyInitials: initialsOf(raw.typent_code),
    thirdPartyCode: tooltipValue(thirdPartyTip, /^customer code/i) || tooltipValue(thirdPartyTip, /^(vendor|supplier) code/i),
    thirdPartyTip,
    city: raw.contact || null,
    paymentType: payment.main && payment.main !== '-' ? payment.main : null,
    paymentTerms: terms && terms !== '-' ? terms : null,
    amountExclTax: parseAmount(htMatch?.[1] ?? '0'),
    vat: parseAmount(vatMatch?.[1] ?? '0'),
    amountInclTax: parseAmount(mainMatch?.[1] ?? '0'),
    author: mainAndNote(raw.author).main,
    authorHref: hrefOf(raw.author),
    authorInitials: initialsOf(raw.author),
    authorTip: cellTooltip(raw.author),
    status: status.main,
    currency: status.note.replace(/^Currency:\s*/i, ''),
    zraSucceeded: /succeeded/i.test(zraText),
    zraStatusMessage: zraText,
    zraRefreshRef: /fnupdatezrainvoice\(\s*['"]?([^'",)\s]+)/.exec(raw.zrastatus ?? '')?.[1] ?? null,
  }
}
