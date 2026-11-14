// Types of the vatByCustomer page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

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
