// Types of the productAccounts page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/admin/productaccount.php — "Products accounts". One POST form
// (token, action=update) around:
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
