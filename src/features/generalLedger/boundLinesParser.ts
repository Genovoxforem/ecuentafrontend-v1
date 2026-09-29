// accountancy/customer/lines.php — "Bound lines of invoices" (the customer
// "Dispatched" screen). Confirmed live against 172.16.5.10 and in the PHP
// source: one POST form (token) around a table where every bound invoice line
// has a `changeaccount[]` checkbox (value = facturedet rowid). The bulk
// "Change the binding" button posts the ticked ids plus `account_parent`
// (an account option value, "0" = none) and runs
// UPDATE facturedet SET fk_code_ventilation=… — a single-line edit uses the
// same request with one id. `limit` / `page` are plain GET params.

export interface BoundLine {
  lineId: string
  invoiceId: string
  invoiceRef: string
  date: string
  productId: string
  productName: string
  productRef: string
  description: string
  amount: string
  taxRate: string
  thirdPartyId: string
  thirdParty: string
  country: string
  vatId: string
  account: string
}

export interface BoundLinesPage {
  token: string
  info: string
  limit: number
  page: number
  pageCount: number
  accounts: { value: string; label: string }[] // includes "0" = --- None ---
  rows: BoundLine[]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const qs = (href: string | null | undefined, key: string) => new URLSearchParams((href ?? '').split('?')[1] ?? '').get(key) ?? ''

export function parseBoundLines(doc: Document): BoundLinesPage {
  const first = doc.querySelector('input[name="changeaccount[]"]')
  const form = first?.closest('form') ?? Array.from(doc.querySelectorAll('form')).find((f) => f.querySelector('select[name="account_parent"]')) ?? null
  const val = (name: string) => form?.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? ''

  const accounts = Array.from(form?.querySelectorAll<HTMLOptionElement>('select[name="account_parent"] option') ?? [])
    .filter((o) => o.value !== '')
    .map((o) => ({ value: o.value, label: text(o) }))

  // Columns are found by header text, not position: the vendor page
  // (accountancy/supplier/lines.php) has an extra invoice-label column before
  // the date that the customer page lacks.
  const headRow = Array.from(first?.closest('table')?.querySelectorAll('tr') ?? []).find((tr) => /^Id\s*line/i.test(text(tr.children[0])) && !tr.querySelector('select, input:not([type="checkbox"])'))
  const heads = Array.from(headRow?.children ?? []).map((h) => text(h).toLowerCase())
  const col = (re: RegExp, fallback: number) => {
    const i = heads.findIndex((h) => re.test(h))
    return i >= 0 ? i : fallback
  }
  const ix = {
    invoice: col(/^invoice$/, 1),
    date: col(/^date/, 2),
    product: col(/^product\s*ref/, 3),
    desc: col(/^(product\s*)?desc/, 4),
    amount: col(/^amount/, 5),
    tax: col(/^tax/, 6),
    party: col(/^third/, 7),
    country: col(/^country/, 8),
    vat: col(/^vat/, 9),
    account: col(/^account/, 10),
  }

  const rows: BoundLine[] = []
  for (const check of Array.from(form?.querySelectorAll<HTMLInputElement>('input[name="changeaccount[]"]') ?? [])) {
    const tr = check.closest('tr')
    const c = Array.from(tr?.children ?? []) as HTMLElement[]
    if (c.length < 11) continue
    const prodLink = c[ix.product]?.querySelector('a') ?? null
    const prodRef = text(prodLink?.querySelector('.small'))
    const socLink = c[ix.party]?.querySelector('a') ?? null
    const acc = (c[ix.account] ?? c[c.length - 2]).cloneNode(true) as HTMLElement
    acc.querySelectorAll('a').forEach((a) => a.remove()) // drop the pencil link
    rows.push({
      lineId: check.value,
      invoiceId: qs(c[ix.invoice]?.querySelector('a')?.getAttribute('href'), 'facid'),
      invoiceRef: text(c[ix.invoice]),
      date: text(c[ix.date]),
      productId: qs(prodLink?.getAttribute('href'), 'id'),
      productName: text(prodLink).replace(prodRef, '').trim(),
      productRef: prodRef.replace(/^Ref:\s*/i, ''),
      description: text(c[ix.desc]),
      amount: text(c[ix.amount]),
      taxRate: text(c[ix.tax]),
      thirdPartyId: qs(socLink?.getAttribute('href'), 'socid'),
      thirdParty: (socLink?.lastChild?.textContent ?? text(c[ix.party])).trim(),
      country: text(c[ix.country]),
      vatId: text(c[ix.vat]),
      account: text(acc),
    })
  }

  const pageNums = Array.from(doc.querySelectorAll('a[href*="page="]')).map((a) => Number(qs(a.getAttribute('href'), 'page')))
  const page = Number(val('page')) || 0
  return {
    token: val('token'),
    info: text(doc.querySelector('.info, .alert-info, .callout')),
    limit: Number(form?.querySelector<HTMLSelectElement>('select[name="limit"]')?.value) || 25,
    page,
    pageCount: Math.max(page, ...pageNums.filter((n) => Number.isFinite(n))) + 1,
    accounts,
    rows,
  }
}
