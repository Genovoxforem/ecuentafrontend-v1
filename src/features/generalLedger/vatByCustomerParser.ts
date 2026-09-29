import { cellText } from './legacyTable'

// compta/tva/clients.php ("Report by customer - Sales tax"). From the page's own PHP and live markup:
//   - the period is read from `date_startday|month|year` and `date_endday|month|year` (without them
//     the backend takes the previous quarter), and `min` hides third parties whose turnover is not
//     above that amount; the period is printed as "For The Period of dd-mm-yyyy To dd-mm-yyyy";
//   - one table with two sections (Customers invoices, then Vendors invoices), each headed by a
//     `liste_titre` row, holding a "Third-party: …" row, that party's invoice lines and a
//     `liste_total` "Total:" row; the last row is "Total to pay" (VAT received minus VAT paid);
//   - on a customer line the 4th cell is the VAT rate; on a vendor line it holds the vendor instead.

export interface VatCustomerLink {
  text: string
  // Root-relative as printed.
  href: string | null
}

export interface VatCustomerLine {
  ref: VatCustomerLink
  date: string
  datePayment: string
  // The VAT rate on a customer line, the vendor on a vendor line.
  rateOrParty: VatCustomerLink
  // The product chip ("Ref: 001") and the description after it.
  productRef: string
  productHref: string | null
  description: string
  amount: string
  payment: string
  net: string
  tax: string
}

export interface VatCustomerGroup {
  party: VatCustomerLink
  // The small line under the name (the company name).
  note: string
  lines: VatCustomerLine[]
  totalNet: string
  totalTax: string
}

export interface VatCustomerSection {
  headers: string[]
  groups: VatCustomerGroup[]
}

export interface VatByCustomerPage {
  // yyyy-mm-dd, from "For The Period of dd-mm-yyyy To dd-mm-yyyy".
  dateStart: string
  dateEnd: string
  min: string
  sections: VatCustomerSection[]
  totalToPay: string
}

const isoFromDmy = (text: string) => {
  const m = /(\d{2})-(\d{2})-(\d{4})/.exec(text)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

// The avatar circle ("CU") is decoration; its letters must not glue onto the name.
function withoutAvatar(el: Element | undefined): Element | undefined {
  const copy = el?.cloneNode(true) as Element | undefined
  copy?.querySelectorAll('.avatar-circle, script, style').forEach((a) => a.remove())
  return copy
}

const link = (el: Element | undefined): VatCustomerLink => ({ text: cellText(withoutAvatar(el)), href: el?.querySelector('a[href]')?.getAttribute('href') ?? null })

export function readVatByCustomer(doc: Document): VatByCustomerPage {
  // The page prints its report table after hidden print blocks; it is the one with the section headers.
  const table = Array.from(doc.querySelectorAll('table.bd_border')).find((t) => t.querySelector('tr.liste_titre'))
  if (!table) throw new Error('The report on this backend page was not recognised.')

  const sections: VatCustomerSection[] = []
  let group: VatCustomerGroup | null = null
  let totalToPay = ''

  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    if (tr.closest('table') !== table) continue
    const tds = Array.from(tr.children)
    if (tr.classList.contains('liste_titre')) {
      sections.push({ headers: tds.map((td) => cellText(td)), groups: [] })
      group = null
    } else if (tds[0]?.classList.contains('tax_rate')) {
      const party = tds[0].querySelector('a[href]')
      group = { party: { text: cellText(withoutAvatar(party ?? undefined)), href: party?.getAttribute('href') ?? null }, note: cellText(tds[0].querySelector('small')), lines: [], totalNet: '', totalTax: '' }
      sections[sections.length - 1]?.groups.push(group)
    } else if (tr.classList.contains('oddeven') && group) {
      const product = tds[4]
      const chip = product?.querySelector('a[href]')
      const rest = product?.cloneNode(true) as Element | undefined
      rest?.querySelector('a[href]')?.remove()
      group.lines.push({
        ref: link(tds[0]),
        date: cellText(tds[1]),
        datePayment: cellText(tds[2]),
        rateOrParty: link(tds[3]),
        productRef: cellText(chip),
        productHref: chip?.getAttribute('href') ?? null,
        description: cellText(rest).replace(/^-\s*/, ''),
        amount: cellText(tds[5]),
        payment: cellText(tds[6]),
        net: cellText(tds[7]),
        tax: cellText(tds[8]),
      })
    } else if (tr.classList.contains('liste_total')) {
      const texts = tds.map((td) => cellText(td)).filter((t) => t && t !== ' ')
      if (/^total to pay/i.test(texts[0] ?? '')) totalToPay = texts[texts.length - 1] ?? ''
      else if (group) {
        group.totalNet = texts[texts.length - 2] ?? ''
        group.totalTax = texts[texts.length - 1] ?? ''
      }
    }
  }

  const period = cellText(doc.querySelector('.sub_head')).split(/\bTo\b/i)
  return {
    dateStart: isoFromDmy(period[0] ?? ''),
    dateEnd: isoFromDmy(period[1] ?? ''),
    min: doc.querySelector<HTMLInputElement>('input[name="min"]')?.value ?? '',
    sections,
    totalToPay,
  }
}
