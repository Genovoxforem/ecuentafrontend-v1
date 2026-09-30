// accountancy/customer/list.php — "Lines of invoices to bind" (the customer
// "ToDispatch" screen). Confirmed live against 172.16.5.10. One form (POST,
// hidden action=ventil + token) around a table where every unbound invoice
// line has: a select `codeventil<lineId>` pre-set to the suggested account,
// and a checkbox `toselect[]` with value "<lineId>_0". Choosing massaction
// "Bind" and pressing Confirm binds the ticked lines. `limit` and `page` are
// plain GET params; the real page embeds all ~370 account options in every
// row (megabytes per page), so the option list is read once from the first row.

export interface BindLine {
  lineId: string
  selectValue: string // the checkbox value as printed ("<lineId>_<row index>")
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
  defaultAccount: string
  productAccount: string // "" when the backend says "Not defined"
  selectedAccount: string // option value pre-selected by the backend
}

export interface BindLinesPage {
  token: string
  info: string
  limit: number
  page: number
  pageCount: number
  sortfield: string
  sortorder: string
  accounts: { value: string; label: string }[]
  rows: BindLine[]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const qs = (href: string | null | undefined, key: string) => new URLSearchParams((href ?? '').split('?')[1] ?? '').get(key) ?? ''

export function parseBindLines(doc: Document): BindLinesPage {
  const form = Array.from(doc.querySelectorAll('form')).find((f) => f.querySelector('select[name="massaction"]'))
  const val = (name: string) => form?.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? ''

  const firstSelect = form?.querySelector<HTMLSelectElement>('select[name^="codeventil"]')
  const accounts = Array.from(firstSelect?.options ?? []).map((o) => ({ value: o.value, label: text(o) }))

  const rows: BindLine[] = []
  for (const tr of Array.from(form?.querySelectorAll('tr') ?? [])) {
    const select = tr.querySelector<HTMLSelectElement>('select[name^="codeventil"]')
    const check = tr.querySelector<HTMLInputElement>('input[name="toselect[]"]')
    if (!select || !check) continue
    const c = Array.from(tr.children) as HTMLElement[]
    if (c.length < 13) continue

    const prodLink = c[3].querySelector('a')
    const prodRef = text(prodLink?.querySelector('.small'))
    const prodName = text(prodLink).replace(prodRef, '').trim()
    const socLink = c[7].querySelector('a')
    const acc = text(c[10])
    const m = /Default for product:\s*(.*?)\s*This product:\s*(.*)$/i.exec(acc)
    const thisProduct = m?.[2] ?? ''

    rows.push({
      lineId: check.value.split('_')[0],
      selectValue: check.value,
      invoiceId: qs(c[1].querySelector('a')?.getAttribute('href'), 'facid'),
      invoiceRef: text(c[1]),
      date: text(c[2]),
      productId: qs(prodLink?.getAttribute('href'), 'id'),
      productName: prodName,
      productRef: prodRef.replace(/^Ref:\s*/i, ''),
      description: text(c[4]),
      amount: text(c[5]),
      taxRate: text(c[6]),
      thirdPartyId: qs(socLink?.getAttribute('href'), 'socid'),
      // The link holds an initials badge plus the name; take the name node.
      thirdParty: (socLink?.lastChild?.textContent ?? text(c[7])).trim(),
      country: text(c[8]),
      vatId: text(c[9]),
      defaultAccount: m?.[1] ?? '',
      productAccount: /not defined/i.test(thisProduct) ? '' : thisProduct,
      selectedAccount: select.value,
    })
  }

  const pageNums = Array.from(form?.querySelectorAll('a[href*="page="]') ?? []).map((a) => Number(qs(a.getAttribute('href'), 'page')))
  const page = Number(val('page')) || 0

  return {
    token: val('token'),
    info: text(doc.querySelector('.info, .alert-info, .callout')),
    limit: Number(form?.querySelector<HTMLSelectElement>('[name="limit"]')?.value) || 25,
    page,
    pageCount: Math.max(page, ...pageNums.filter((n) => Number.isFinite(n))) + 1,
    sortfield: val('sortfield'),
    sortorder: val('sortorder'),
    accounts,
    rows,
  }
}
