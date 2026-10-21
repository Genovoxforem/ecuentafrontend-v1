/**
 * Bank account API client — compta/bank/fapi/list.php.
 *
 * Bearer-token (X-API-Key) JSON, same envelope as the other fapi modules. It replaces
 * the sidebar endpoint (bank-sidebar-list-ajax.php), which has no NOLOGIN and so answers
 * a background fetch with the HTML login page and status 200. A backend that does not
 * have it answers a bare 404, which isMissingEndpoint() (api/products.ts) detects.
 */

import { fapi } from './axios'

export interface BankAccountApiRow {
  id: number
  ref: string
  label: string
  bank: string
  number: string
  iban: string
  bic: string
  currency: string
  type: number
  type_label: string
  closed: number
  owner: string
  branch: string
  account_number: string
  accountancy_journal: number
  /** Only present when requested with with_balance. */
  balance?: number
}

interface Envelope<T> {
  success: boolean
  data: T
  message: string | null
}

export interface BankAccountListParams {
  /** Include closed accounts (the endpoint lists open ones by default). */
  includeClosed?: boolean
  /** One extra query per account, so off unless a screen shows balances. */
  withBalance?: boolean
  id?: number
}

export async function listBankAccounts(params: BankAccountListParams = {}): Promise<BankAccountApiRow[]> {
  const { data: body } = await fapi.get<Envelope<{ accounts: BankAccountApiRow[] }>>('/compta/bank/fapi/list.php', {
    params: { open: params.includeClosed ? 0 : undefined, with_balance: params.withBalance ? 1 : undefined, id: params.id },
  })
  if (!body?.success || !Array.isArray(body.data?.accounts)) throw new Error(body?.message || 'Could not load the bank accounts.')
  return body.data.accounts
}
