// compta/tva/quadri_detail.php — "SALE TAX REPORT BY RATES". Confirmed live
// against 172.16.5.10: a filter form (newdatepicker "MM/dd/yyyy-MM/dd/yyyy",
// invoice_type customer|vendor, status_val All|Succeed|Failed — plain GET
// params work as well as the POST) and table#example3 with one row per
// VAT rate/code. Each row's "+" button loads tvadetailsajax.php with the
// row's data-id, which returns the invoice lines behind that rate.

export interface VatRateRow {
  rate: string
  code: string
  excl: string
  vat: string
  incl: string
  detailId: string
}

export interface VatByRatePage {
  title: string
  period: string // "MM/dd/yyyy-MM/dd/yyyy"
  invoiceType: string
  invoiceTypeOptions: { value: string; label: string }[]
  status: string
  statusOptions: { value: string; label: string }[]
  rows: VatRateRow[]
  totals: { excl: string; vat: string; incl: string } | null
}

export interface VatRateDetailRow {
  ref: string
  receiptNo: string
  customer: string
  customerId: string
  date: string
  product: string
  productRef: string
  excl: string
  vat: string
  incl: string
}

export interface VatRateDetail {
  period: string
  rateLabel: string
  rows: VatRateDetailRow[]
  totals: { excl: string; vat: string; incl: string } | null
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const opts = (doc: Document, name: string) =>
  Array.from(doc.querySelectorAll<HTMLOptionElement>(`select[name="${name}"] option`)).map((o) => ({ value: o.value, label: text(o) }))

export function parseVatByRate(doc: Document): VatByRatePage {
  const table = doc.querySelector('table#example3')
  const heads = Array.from(table?.querySelectorAll('thead th') ?? []).map((h) => text(h).toLowerCase())
  const at = (c: HTMLTableCellElement[], re: RegExp) => text(c[heads.findIndex((h) => re.test(h))])

  const rows: VatRateRow[] = Array.from(table?.querySelectorAll('tbody tr') ?? [])
    .map((tr) => {
      const c = Array.from(tr.querySelectorAll('td'))
      if (c.length < 5) return null
      return {
        rate: at(c, /^vat rate/),
        code: at(c, /^vat code/),
        excl: at(c, /excl/),
        vat: at(c, /^vat amount/),
        incl: at(c, /inc/),
        detailId: tr.querySelector('[data-id]')?.getAttribute('data-id') ?? '',
      }
    })
    .filter((r): r is VatRateRow => r !== null)

  const foot = Array.from(table?.querySelectorAll('tfoot th') ?? []).map((h) => text(h))

  return {
    title: 'Sale tax report by rates',
    period: doc.querySelector<HTMLInputElement>('input[name="newdatepicker"]')?.value ?? '',
    invoiceType: doc.querySelector<HTMLSelectElement>('select[name="invoice_type"]')?.value ?? 'customer',
    invoiceTypeOptions: opts(doc, 'invoice_type'),
    status: doc.querySelector<HTMLSelectElement>('select[name="status_val"]')?.value ?? 'All',
    statusOptions: opts(doc, 'status_val'),
    rows,
    totals: foot.length >= 4 ? { excl: foot[1], vat: foot[2], incl: foot[3] } : null,
  }
}

// tvadetailsajax.php returns an HTML fragment (heading lines + one table).
export function parseVatRateDetail(doc: Document): VatRateDetail {
  const table = doc.querySelector('table')
  const heads = Array.from(table?.querySelectorAll('thead th') ?? []).map((h) => text(h).toLowerCase())
  const idx = (re: RegExp) => heads.findIndex((h) => re.test(h))
  const i = {
    ref: idx(/^ref/),
    receipt: idx(/^receipt/),
    customer: idx(/^(customer|supplier|vendor)/),
    date: idx(/date/),
    product: idx(/^product/),
    excl: idx(/excl/),
    vat: idx(/^vat amount/),
    incl: idx(/inc\./),
  }

  const rows: VatRateDetailRow[] = Array.from(table?.querySelectorAll('tbody tr') ?? [])
    .map((tr) => {
      const c = Array.from(tr.querySelectorAll('td'))
      if (c.length < heads.length || heads.length === 0) return null
      const cell = (n: number) => (n >= 0 ? c[n] : undefined)
      const link = cell(i.customer)?.querySelector('a')
      const prod = cell(i.product)
      // Product cell: avatar icon + name + "Ref: …" caption.
      const prodRef = text(prod?.querySelector('.small'))
      const prodName = text(prod).replace(prodRef, '').trim()
      return {
        ref: text(cell(i.ref)),
        receiptNo: text(cell(i.receipt)),
        // Strip the avatar-initials badge from the customer name.
        customer: (link?.lastChild?.textContent ?? text(cell(i.customer))).trim(),
        customerId: new URLSearchParams((link?.getAttribute('href') ?? '').split('?')[1] ?? '').get('socid') ?? '',
        date: text(cell(i.date)),
        product: prodName,
        productRef: prodRef.replace(/^Ref:\s*/i, ''),
        excl: text(cell(i.excl)),
        vat: text(cell(i.vat)),
        incl: text(cell(i.incl)),
      }
    })
    .filter((r): r is VatRateDetailRow => r !== null)

  const foot = Array.from(table?.querySelectorAll('tfoot th, tfoot td') ?? []).map((h) => text(h))
  const sub = Array.from(doc.querySelectorAll('.sub_head')).map((s) => text(s))

  return {
    period: sub.find((s) => /period/i.test(s))?.replace(/^For the period of\s*/i, '') ?? '',
    rateLabel: (sub.find((s) => /^VAT RATE/i.test(s)) ?? '').replace(/^VAT RATE\s*:\s*/i, ''),
    rows,
    totals: foot.length >= 3 ? { excl: foot[foot.length - 3], vat: foot[foot.length - 2], incl: foot[foot.length - 1] } : null,
  }
}
