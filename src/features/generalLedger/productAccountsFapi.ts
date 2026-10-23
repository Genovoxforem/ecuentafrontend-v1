import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { loadBindableAccounts } from './bindingFapi'
import type { ProductAccountFilters, ProductAccountRow, ProductAccountsPage } from './productAccountsParser'

// accountancy/fapi/product_accounts.php (22 Oct 2026): the accounting account of each product for one of the six modes (sell / buy, home /
// intra-community / export). The list answer was captured from newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-product-accounts.json).
// The set write is "representative" in the document and was not run.

export interface FapiProductAccountsMeta {
  mode: string
  modes: string[]
  mode_descriptions: Record<string, { label: string; description: string; eec_only: boolean }>
  intro: string
  in_eec: boolean
}

export interface FapiProductAccounts {
  items: Array<{ id: number; ref: string; label: string; tva_tx: number; tosell: number; tobuy: number; currentAccount: string; hasValidAccount: boolean }>
  pagination: { page: number; limit: number; total: number; pages: number }
}

const forSale = (i: FapiProductAccounts['items'][number]) => (i.tosell ? 'On Sell' : i.tobuy ? 'On Purchase' : 'Not for sale')

// The modes the page offers, with the endpoint's own labels and descriptions; the intra-community ones only when the company is in the EEC.
export function mapModes(meta: FapiProductAccountsMeta): ProductAccountsPage['modes'] {
  return meta.modes
    .filter((m) => meta.in_eec || !meta.mode_descriptions[m]?.eec_only)
    .map((m) => ({ value: m, label: meta.mode_descriptions[m]?.label ?? m, description: meta.mode_descriptions[m]?.description ?? '' }))
}

export function mapProductAccounts(d: FapiProductAccounts, mode: string, accounts: Array<{ value: string; label: string }>, filters: ProductAccountFilters, meta: FapiProductAccountsMeta): ProductAccountsPage {
  const rows: ProductAccountRow[] = d.items.map((i) => ({
    id: String(i.id),
    name: i.label,
    ref: i.ref,
    label: i.label,
    taxRate: String(i.tva_tx),
    forSale: forSale(i),
    currentAccount: i.currentAccount,
    selectedAccount: i.currentAccount,
  }))
  return {
    token: '',
    mode,
    intro: meta.intro,
    modes: mapModes(meta),
    filters,
    sortfield: '',
    sortorder: '',
    accounts: [{ value: '', label: '' }, ...accounts],
    rows,
  }
}

// The picker takes the account number ("5017"), not the chart row id.
const numberOptions = (opts: Array<{ value: string; label: string }>) => opts.map((o) => ({ value: o.label.split(' - ')[0], label: o.label }))

export async function loadProductAccounts(q: { mode: string; limit: number; page: number; filters: ProductAccountFilters }): Promise<ProductAccountsPage> {
  const f = q.filters
  const [meta, list, accounts] = await Promise.all([
    fapiGet<FapiProductAccountsMeta>('/accountancy/fapi/product_accounts.php', { action: 'meta' }),
    fapiGet<FapiProductAccounts>('/accountancy/fapi/product_accounts.php', {
      mode: q.mode,
      limit: q.limit,
      page: q.page,
      search_ref: f.ref || undefined,
      search_label: f.label || undefined,
      vat: f.vat || undefined,
      account: f.currentAccount || undefined,
      valid: f.currentAccountValid === 'withvalidaccount' ? 1 : f.currentAccountValid === 'withoutvalidaccount' ? 0 : undefined,
      onsell: f.onsell === '-1' ? undefined : f.onsell,
    }),
    loadBindableAccounts(),
  ])
  return mapProductAccounts(list, q.mode, numberOptions(accounts), f, meta)
}

export async function saveProductAccounts(mode: string, selections: Array<{ productId: string; account: string }>): Promise<string> {
  const res = await fapiPost<{ updated: number }>('/accountancy/fapi/product_accounts.php', { mode, items: selections.map((s) => ({ id: Number(s.productId), account: s.account })) }, { action: 'set' })
  return `${res.updated} product(s) updated.`
}
