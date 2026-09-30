// accountancy/admin/productaccount.php — "Products accounts". Confirmed live
// against 172.16.5.10. One POST form (token, action=update) around:
//   - a mode radio `accounting_product_mode` (ACCOUNTANCY_SELL / _SELL_EXPORT /
//     _BUY; also accepted as a GET param),
//   - a filter row (`search_ref`, `search_label`, `search_vat`, `search_onsell`,
//     `search_current_account`, `search_current_account_valid` — GET works;
//     the page defaults the last one to "withoutvalidaccount" when it is not
//     sent at all),
//   - one row per product with a `codeventil_<productId>` select (pre-set to the
//     account the backend would assign) and a `chk_prod[]` checkbox.
// `limit` and `page` are plain GET params; the page prints no pager and no
// total. Every row embeds all ~370 account options, so the option list is read
// once from the first row.

export interface ProductAccountRow {
  id: string
  name: string
  ref: string
  label: string
  taxRate: string
  forSale: string // status badge title, e.g. "On Sell"
  currentAccount: string // "" when the product has no dedicated account
  selectedAccount: string // option value pre-selected by the backend
}

export interface ProductAccountFilters {
  ref: string
  label: string
  vat: string
  onsell: string // "-1" = any, "1" = yes, "0" = no
  currentAccount: string
  currentAccountValid: string // "" | "withoutvalidaccount" | "withvalidaccount"
}

export interface ProductAccountsPage {
  token: string
  mode: string
  // The page's own note under the title (`.alert-info`).
  intro: string
  // The Options table: each mode with the description printed next to its radio.
  modes: { value: string; label: string; description: string }[]
  filters: ProductAccountFilters
  sortfield: string
  sortorder: string
  accounts: { value: string; label: string }[]
  rows: ProductAccountRow[]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const qs = (href: string | null | undefined, key: string) => new URLSearchParams((href ?? '').split('?')[1] ?? '').get(key) ?? ''

export function parseProductAccounts(doc: Document): ProductAccountsPage {
  // Query from `doc`, not the form: the real page's markup nests tables inside
  // the form in a way DOMParser can re-parent.
  const val = (name: string) => doc.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? ''

  const modes = Array.from(doc.querySelectorAll<HTMLInputElement>('input[name="accounting_product_mode"]')).map((r) => ({
    value: r.value,
    label: text(r.parentElement).replace(/^\s*/, ''),
    description: text(r.closest('tr')?.children[1]),
    checked: r.checked,
  }))

  const firstSelect = doc.querySelector<HTMLSelectElement>('select[name^="codeventil_"]')
  const accounts = Array.from(firstSelect?.options ?? []).map((o) => ({ value: o.value, label: text(o) }))

  const check = doc.querySelector('input[name="chk_prod[]"]')
  const headRow = Array.from((check?.closest('table') ?? doc.querySelector('#changeaccount')?.closest('form')?.querySelector('table:last-of-type'))?.querySelectorAll('tr') ?? []).find(
    (tr) => /^Ref/i.test(text(tr.children[0])) && !tr.querySelector('input:not([type="checkbox"]), select'),
  )
  const heads = Array.from(headRow?.children ?? []).map((h) => text(h).toLowerCase())
  const col = (re: RegExp, fallback: number) => {
    const i = heads.findIndex((h) => re.test(h))
    return i >= 0 ? i : fallback
  }
  const ix = { ref: col(/^ref/, 0), label: col(/^label/, 1), tax: col(/^tax/, 2), sale: col(/^for sale/, 3), current: col(/^current/, 4) }

  const rows: ProductAccountRow[] = []
  for (const box of Array.from(doc.querySelectorAll<HTMLInputElement>('input[name="chk_prod[]"]'))) {
    const tr = box.closest('tr')
    const select = tr?.querySelector<HTMLSelectElement>('select[name^="codeventil_"]')
    if (!tr || !select) continue
    const c = Array.from(tr.children) as HTMLElement[]
    const link = c[ix.ref]?.querySelector('a') ?? null
    const small = link?.querySelector('.small')
    const ref = text(small).replace(/^Ref:\s*/i, '')
    const selected = select.options[select.selectedIndex]
    rows.push({
      id: box.value || qs(link?.getAttribute('href'), 'id'),
      name: text(link).replace(text(small), '').trim(),
      ref,
      label: text(c[ix.label]),
      taxRate: text(c[ix.tax]),
      forSale: c[ix.sale]?.querySelector('[title]')?.getAttribute('title') ?? text(c[ix.sale]),
      currentAccount: text(c[ix.current]),
      selectedAccount: selected?.value ?? '',
    })
  }

  return {
    token: val('token'),
    mode: modes.find((m) => m.checked)?.value ?? 'ACCOUNTANCY_SELL',
    intro: text(doc.querySelector('.alert.alert-info')),
    modes: modes.map(({ value, label, description }) => ({ value, label, description })),
    filters: {
      ref: val('search_ref'),
      label: val('search_label'),
      vat: val('search_vat'),
      onsell: val('search_onsell') || '-1',
      currentAccount: val('search_current_account'),
      currentAccountValid: val('search_current_account_valid'),
    },
    sortfield: val('sortfield'),
    sortorder: val('sortorder'),
    accounts,
    rows,
  }
}
