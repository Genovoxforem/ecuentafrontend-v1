import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { BankAccountListRow, BankAccountReconcile } from './bankAccountsListParser'
import type { BankBudget } from './bankBudgetParser'
import type { BankTransactionCategoryList } from './bankTransactionCategParser'
import type { BankEntryCategoryOption, BankEntryDetail, BankEntryLedger, BankEntryLink, BankEntryLog } from './bankEntryDetailParser'
import type { BankAccountFormContext, BankAccountFormOption } from './bankAccountFormParser'
import type { BankEntriesFilters, BankEntryRow, BankAccountStatusFilter, LoanRow } from './banking.queries'

// The banking surface on compta/bank/fapi, compta/prelevement/fapi, compta/paiement/fapi and loan/fapi (26 Oct 2026), replacing the session-only
// bank*-ajax.php files and the scraped HTML pages. Every read answer was captured from newecuenta on 26 Oct 2026 (tests/fixtures/banking-*.json).
// The documented lists that are empty there (categories, statements, entries by category, loans, direct debit) take their row shape from the
// document's own "Item shape, from code" and have not been seen with live rows. entry.php update / reconcile / unreconcile answer a plan
// ("would_execute", executed:false) and write nothing, so those two actions stay on the old page (see the bug list).

export const mdy = (iso: string | null | undefined) => {
  const [y, m, d] = (iso ?? '').slice(0, 10).split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}
const money = (n: number | null | undefined) => (n === null || n === undefined ? '' : formatMoney(n))

// ---- Bank Management Details: list.php?detail=1 ----------------------------------------------------------------------------------------

export interface FapiBankAccount {
  id: number
  ref: string
  label: string
  type_label: string
  number: string
  account_number: string
  accountancy_journal: string
  currency: string
  closed: boolean
  status_label: string
  reconcilable: number
  reconcile_state: string
  to_reconcile: number
  balance: number
}

// 1 = can be reconciled (a count), -2 = cash, -3 = closed; anything else has reconciliation switched off.
function reconcileOf(a: FapiBankAccount): BankAccountReconcile {
  if (a.reconcilable === 1) return { kind: 'count', count: a.to_reconcile, late: 0 }
  if (a.reconcilable === -2) return { kind: 'text', text: 'Cash account' }
  if (a.reconcilable === -3 || a.closed) return { kind: 'text', text: 'Closed' }
  return { kind: 'text', text: 'Conciliation disabled' }
}

export const mapBankAccountRow = (a: FapiBankAccount): BankAccountListRow => ({
  id: String(a.id),
  ref: a.ref,
  label: a.label,
  type: a.type_label,
  number: a.number || '',
  accountingAccount: a.account_number || '',
  journal: a.accountancy_journal || '',
  toReconcile: reconcileOf(a),
  open: !a.closed,
  statusLabel: a.status_label,
  balance: a.balance,
  balanceText: `${formatMoney(a.balance)} ${a.currency}`,
})

export async function loadBankAccountsDetailed(status: BankAccountStatusFilter): Promise<BankAccountListRow[]> {
  const d = await fapiGet<{ accounts: FapiBankAccount[] }>('/compta/bank/fapi/list.php', { detail: 1, status: status === 'opened' ? 'opened' : status, limit: 1000 })
  return d.accounts.map(mapBankAccountRow)
}

// ---- Entries: entries.php ----------------------------------------------------------------------------------------------------------------

export interface FapiBankEntry {
  id: number
  account_id: number
  account_ref: string
  date_operation: string
  date_value: string
  label: string
  payment_type_label: string | null
  num_chq: string
  num_releve: string
  debit: number | null
  credit: number | null
  running_balance: number | null
  reconciled: number
  thirdparty: { id: number; name: string } | null
}
export interface FapiBankEntries {
  entries: FapiBankEntry[]
  summary?: { total: number; reconciled: number; to_reconcile: number }
  pagination: { page: number; page_count: number; limit: number; total: number; filtered: number }
}

export const mapBankEntryRow = (e: FapiBankEntry, i: number): BankEntryRow => ({
  id: i,
  rowid: e.id,
  refLabel: String(e.id),
  description: e.label,
  dateOps: mdy(e.date_operation),
  dateValue: mdy(e.date_value),
  paymentType: e.payment_type_label ?? '',
  checkNum: e.num_chq ?? '',
  thirdParty: e.thirdparty?.name ?? '',
  thirdPartySocid: e.thirdparty?.id,
  bankAccount: e.account_ref,
  bankAccountId: e.account_id,
  debit: money(e.debit),
  credit: money(e.credit),
  runningBalance: money(e.running_balance),
  accountStatement: e.num_releve ?? '',
  conciliated: e.reconciled === 1,
})

export function entryParams(accountId: number | undefined, page: number, length: number, f?: BankEntriesFilters): Record<string, string | number | undefined> {
  return {
    account: accountId || undefined,
    page,
    // the endpoint's own ceiling is 1000 rows a page
    limit: Math.min(length, 1000),
    search: f?.search || undefined,
    reconciled: f?.unreconciledOnly ? 0 : undefined,
    date_start: f?.dateOpsFrom || undefined,
    date_end: f?.dateOpsTo || undefined,
    datev_start: f?.dateValueFrom || undefined,
    datev_end: f?.dateValueTo || undefined,
  }
}

export async function loadBankEntries(accountId: number | undefined, page: number, length: number, f?: BankEntriesFilters) {
  const d = await fapiGet<FapiBankEntries>('/compta/bank/fapi/entries.php', entryParams(accountId, page, length, f))
  return { rows: d.entries.map(mapBankEntryRow), total: d.pagination.total, filtered: d.pagination.filtered }
}

// The count of lines still to reconcile (one account, or all of them): the endpoint's own summary.
export async function countUnreconciled(accountId?: number): Promise<number> {
  const d = await fapiGet<FapiBankEntries>('/compta/bank/fapi/entries.php', { account: accountId || undefined, limit: 1 })
  return d.summary?.to_reconcile ?? 0
}

// ---- One entry: entry.php (detail, log, ledger) ------------------------------------------------------------------------------------------

export interface FapiBankEntryDetail {
  id: number
  account: { id: number; ref: string; label: string; currency: string }
  date_operation: string
  date_value: string
  raw_label: string
  amount: number
  payment_type: string
  num_chq: string
  emetteur: string
  bank_chq: string
  num_releve: string
  reconciled: boolean
  accounted: boolean
  categories: Array<number | { id: number }>
  links: Array<{ type: string; target_id: number; label: string; route: string }>
}
export interface FapiTransferMeta {
  accounts: Array<{ id: number; ref: string; label: string; currency: string; closed: number }>
  payment_types: Array<{ id: number; code: string; label: string }>
}

const linkKind = (t: string): BankEntryLink['kind'] => (t === 'company' ? 'thirdparty' : t === 'payment' ? 'payment' : t === 'bank' ? 'entry' : 'other')

export function mapBankEntryDetail(d: FapiBankEntryDetail, meta: FapiTransferMeta, categories: Array<{ id: number; label: string }>): BankEntryDetail {
  const chosen = new Set(d.categories.map((c) => (typeof c === 'number' ? c : c.id)))
  const type = meta.payment_types.find((p) => p.code === d.payment_type)
  const accountOptions: BankAccountFormOption[] = meta.accounts.map((a) => ({ value: String(a.id), label: `${a.ref} - ${a.label}` }))
  if (!accountOptions.some((o) => o.value === String(d.account.id))) accountOptions.push({ value: String(d.account.id), label: `${d.account.ref} - ${d.account.label}` })
  const categoryOptions: BankEntryCategoryOption[] = categories.map((c) => ({ value: String(c.id), label: c.label, selected: chosen.has(c.id) }))
  return {
    // writes still go through the old page, which hands out its own token
    token: '',
    rowid: d.id,
    headerAccountLabel: `${d.account.ref} (${d.account.label})`,
    headerAmount: `${formatMoney(d.amount)} ${d.account.currency}`,
    headerOperationDate: mdy(d.date_operation),
    accountedInLedger: d.accounted,
    links: d.links.map((l) => ({ label: l.label, kind: linkKind(l.type), id: l.target_id })),
    accountId: String(d.account.id),
    accountOptions,
    paymentType: type ? String(type.id) : '',
    paymentTypeOptions: [{ value: '', label: '' }, ...meta.payment_types.map((p) => ({ value: String(p.id), label: p.label }))],
    checkNum: d.num_chq ?? '',
    transmitter: d.emetteur ?? '',
    bankOfCheck: d.bank_chq ?? '',
    dateOps: mdy(d.date_operation),
    dateValue: mdy(d.date_value),
    label: d.raw_label,
    amount: String(d.amount),
    currencyLabel: d.account.currency,
    categoryOptions,
    reconcileStatement: d.num_releve ?? '',
    reconciled: d.reconciled,
  }
}

export async function loadBankEntryDetail(rowid: number): Promise<BankEntryDetail> {
  const [d, meta, cats] = await Promise.all([
    fapiGet<FapiBankEntryDetail>('/compta/bank/fapi/entry.php', { id: rowid }),
    fapiGet<FapiTransferMeta>('/compta/bank/fapi/transfer.php'),
    fapiGet<{ categories: Array<{ id: number; label: string }> }>('/compta/bank/fapi/categories.php'),
  ])
  return mapBankEntryDetail(d, meta, cats.categories)
}

export interface FapiBankEntryLog {
  date_creation: string | null
  date_modification: string | null
  user_creation: { id: number; login: string; name: string } | null
}

const stamp = (iso: string | null) => {
  if (!iso) return ''
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  const h = t.getHours() % 12 || 12
  return `${p(t.getMonth() + 1)}/${p(t.getDate())}/${t.getFullYear()} ${p(h)}:${p(t.getMinutes())} ${t.getHours() >= 12 ? 'PM' : 'AM'}`
}

export const mapBankEntryLog = (d: FapiBankEntryLog): BankEntryLog => ({
  accountedStatusText: '',
  createdByName: d.user_creation?.name?.replace(/\s+/g, ' ').trim() ?? '',
  createdByUserId: d.user_creation?.id,
  creationDate: stamp(d.date_creation),
  lastModificationDate: stamp(d.date_modification),
})

export const loadBankEntryLog = async (rowid: number) => mapBankEntryLog(await fapiGet<FapiBankEntryLog>('/compta/bank/fapi/entry.php', { id: rowid, tab: 'log' }))

export interface FapiBankEntryLedger {
  lines: Array<Record<string, unknown>>
  totals: { debit: number; credit: number; balance: number }
}

// The accounting lines posted for the entry. A posted line's own columns were never seen (the instance has none), so a line is shown with the
// columns the ledger endpoints use elsewhere (doc date, doc ref, journal, account, label, debit, credit).
export function mapBankEntryLedger(d: FapiBankEntryLedger): BankEntryLedger {
  const text = (v: unknown) => (v === null || v === undefined ? '' : String(v))
  const num = (v: unknown) => (typeof v === 'number' && v !== 0 ? formatMoney(v) : '')
  return {
    rows: d.lines.map((l) => ({
      date: text(l.doc_date),
      accountingDoc: text(l.doc_ref),
      ref: text(l.doc_ref),
      codeJournal: text(l.code_journal),
      account: text(l.numero_compte),
      label: text(l.label_operation),
      debit: num(l.debit),
      credit: num(l.credit),
      amount: text(l.amount),
    })),
    totalDebit: formatMoney(d.totals.debit),
    totalCredit: formatMoney(d.totals.credit),
    totalAmount: formatMoney(d.totals.balance),
  }
}

export const loadBankEntryLedger = async (rowid: number) => mapBankEntryLedger(await fapiGet<FapiBankEntryLedger>('/compta/bank/fapi/entry.php', { id: rowid, tab: 'ledger' }))

// ---- Entries by category: by_category.php -------------------------------------------------------------------------------------------------

export interface FapiByCategory {
  rows: Array<{ category_id: number; category: string; count: number; total: number; average: number }>
  total: { count: number; total: number; average: number }
}

export const mapByCategory = (d: FapiByCategory): BankBudget => ({
  rows: d.rows.map((r) => ({ category: r.category, count: String(r.count), total: formatMoney(r.total), average: formatMoney(r.average) })),
  totalTotal: formatMoney(d.total.total),
  totalAverage: formatMoney(d.total.average),
})

export const loadBankBudget = async () => mapByCategory(await fapiGet<FapiByCategory>('/compta/bank/fapi/by_category.php'))

// ---- Transaction tags: categories.php -----------------------------------------------------------------------------------------------------

export const loadBankTransactionCategories = async (): Promise<BankTransactionCategoryList> => {
  const d = await fapiGet<{ categories: Array<{ id: number; label: string }> }>('/compta/bank/fapi/categories.php')
  return { token: '', rows: d.categories.map((c) => ({ id: c.id, label: c.label })) }
}
export const addBankTransactionCategory = (label: string) => fapiPost('/compta/bank/fapi/categories.php', { label }, { action: 'create' })
export const updateBankTransactionCategory = (id: number, label: string) => fapiPost('/compta/bank/fapi/categories.php', { id, label }, { action: 'update' })
// confirm:1 is what turns the dry run into the delete
export const deleteBankTransactionCategory = (id: number) => fapiPost('/compta/bank/fapi/categories.php', { id, confirm: 1 }, { action: 'delete' })

// ---- Internal transfer: transfer.php -------------------------------------------------------------------------------------------------------

export async function createInternalTransfer(i: { accountFromId: string; accountToId: string; date: string; label: string; amount: string; amountTo?: string }): Promise<void> {
  const num = (v: string) => Number(v.replace(/,/g, ''))
  await fapiPost(
    '/compta/bank/fapi/transfer.php',
    {
      from_account: Number(i.accountFromId),
      to_account: Number(i.accountToId),
      date: i.date,
      label: i.label.trim(),
      amount: num(i.amount),
      ...(i.amountTo ? { amount_to: num(i.amountTo) } : {}),
    },
    { action: 'create' },
  )
}

// ---- Employee loans: loans.php --------------------------------------------------------------------------------------------------------------

export interface FapiLoans {
  items: Array<{ id: number; ref: string; label: string; capital: number; status_label: string }>
}
export const mapLoans = (d: FapiLoans): LoanRow[] => d.items.map((l) => ({ id: l.id, label: [l.ref, l.label].filter(Boolean).join(' - '), amountLabel: formatMoney(l.capital), statusLabel: l.status_label }))
export const loadLoanList = async () => mapLoans(await fapiGet<FapiLoans>('/loan/fapi/loans.php', { limit: 200 }))

// ---- Linked files: documents.php (list, delete). Upload and link stay on the old page: their bodies are not documented. -----------------

export interface FapiBankDocuments {
  files: Array<{ name: string; size: number; date: string; download_url: string }>
}
export interface BankDocumentFile {
  name: string
  size: string
  date: string
  url: string
}

const bytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} Bytes`)

export const mapBankDocuments = (d: FapiBankDocuments): BankDocumentFile[] => d.files.map((f) => ({ name: f.name, size: bytes(f.size), date: mdy(f.date), url: f.download_url }))
export const loadBankDocuments = async (accountId: number) => mapBankDocuments(await fapiGet<FapiBankDocuments>('/compta/bank/fapi/documents.php', { account: accountId }))
export const deleteBankDocument = (accountId: number, file: string) => fapiPost('/compta/bank/fapi/documents.php', { file }, { account: accountId, action: 'delete' })

// ---- Statements and statistics: statements.php, stats.php (group=day | month | type) ------------------------------------------------------

export interface FapiBankStatements {
  statements: Array<{ num: string; balance_start: number; balance_end: number }>
}
export interface BankStatementRow {
  ref: string
  initialBalance: number
  endBalance: number
}
export const mapBankStatements = (d: FapiBankStatements): BankStatementRow[] => d.statements.map((s) => ({ ref: s.num, initialBalance: s.balance_start, endBalance: s.balance_end }))
export const loadBankStatements = async (accountId: number) => mapBankStatements(await fapiGet<FapiBankStatements>('/compta/bank/fapi/statements.php', { account: accountId }))

// group=day: the balance of each day of a month (null for the days still to come) and its movements
export interface FapiStatsDay {
  balance_by_day_month: Array<{ date: string; balance: number | null }>
  movements_by_day: Array<{ day: string; credit: number; debit: number }>
}
export interface BankStatsDay {
  balance: Array<{ day: number; balance: number | null }>
  movements: Array<{ day: number; credit: number; debit: number }>
}
export const mapStatsDay = (d: FapiStatsDay): BankStatsDay => ({
  balance: d.balance_by_day_month.map((b) => ({ day: Number(b.date.slice(8, 10)), balance: b.balance })),
  movements: d.movements_by_day.map((m) => ({ day: Number(m.day), credit: m.credit, debit: m.debit })),
})
export const loadBankStatsDay = async (accountId: number, year: number, month: number) =>
  mapStatsDay(await fapiGet<FapiStatsDay>('/compta/bank/fapi/stats.php', { account: accountId, group: 'day', year, month }))

// group=month: the movements of each month of a year
export interface FapiStatsMonth {
  movements_by_month: Array<{ month: string; credit: number; debit: number }>
}
export const mapStatsMonth = (d: FapiStatsMonth) => d.movements_by_month.map((m) => ({ month: Number(m.month), credit: m.credit, debit: m.debit }))
export const loadBankStatsMonth = async (accountId: number, year: number) => mapStatsMonth(await fapiGet<FapiStatsMonth>('/compta/bank/fapi/stats.php', { account: accountId, group: 'month', year }))

// group=type: the annual grid (three years, twelve months, debit and credit)
export interface FapiStatsType {
  years: number[]
  months: Array<{ month: number; label: string; by_year: Record<string, { debit: number; credit: number }> }>
  totals: Record<string, { debit: number; credit: number }>
  current_balance: number
}
export interface BankStatsType {
  years: number[]
  months: Array<{ month: number; label: string; byYear: Record<string, { debit: number; credit: number }> }>
  totals: Record<string, { debit: number; credit: number }>
  currentBalance: number
}
export const mapStatsType = (d: FapiStatsType): BankStatsType => ({
  years: d.years,
  months: d.months.map((m) => ({ month: m.month, label: m.label, byYear: m.by_year })),
  totals: d.totals,
  currentBalance: d.current_balance,
})
export const loadBankStatsType = async (accountId: number) => mapStatsType(await fapiGet<FapiStatsType>('/compta/bank/fapi/stats.php', { account: accountId, group: 'type' }))

// ---- Cheque deposits area: cheque_deposits.php (the count; the slips and receipts are empty on the instance, so their fields are not known) ----

export interface FapiChequeDeposits {
  checks_awaiting_deposit: number
  latest_receipts: unknown[]
}
export const mapChequeArea = (d: FapiChequeDeposits) => ({ awaitingDeposit: d.checks_awaiting_deposit, receiptCount: d.latest_receipts.length })
export const loadChequeArea = async () => mapChequeArea(await fapiGet<FapiChequeDeposits>('/compta/paiement/fapi/cheque_deposits.php'))

// ---- New account: account.php (form_options, create) -------------------------------------------------------------------------------------------

export interface FapiAccountOptions {
  currencies: Array<{ code: string; label: string; symbol: string }>
  accounting_journals: Array<{ id: number; code: string; label: string }>
  accounting_accounts: Array<{ id: number; account_number: string; label: string }>
  countries: Array<{ id: number; code: string; label: string }>
  states: Array<{ id?: number; value?: number | string; label?: string; name?: string }>
  default_country: { id: number; code: string }
  currency_default: string
}

// The currency symbol comes as a list of character codes ("[75,77]"): the classic list prints it after the name, e.g. "Bosnia ... Marka (KM)".
const symbolOf = (c: { code: string; symbol: string }) => {
  try {
    const codes = JSON.parse(c.symbol) as number[]
    return Array.isArray(codes) && codes.length ? String.fromCharCode(...codes) : c.code
  } catch {
    return c.code
  }
}

export const mapAccountOptions = (d: FapiAccountOptions): BankAccountFormContext => ({
  token: '',
  currencies: d.currencies.map((c) => ({ value: c.code, label: `${c.label} (${symbolOf(c)})` })),
  countries: d.countries.map((c) => ({ value: String(c.id), label: c.label })),
  defaultCountryValue: String(d.default_country.id),
  states: d.states.map((s) => ({ value: String(s.id ?? s.value ?? ''), label: s.label ?? s.name ?? '' })),
  accountingAccounts: d.accounting_accounts.map((a) => ({ value: a.account_number, label: `${a.account_number} - ${a.label}` })),
  accountingJournals: d.accounting_journals.map((j) => ({ value: String(j.id), label: `${j.code} - ${j.label}` })),
  defaultCurrencyValue: d.currency_default,
})

export const loadAccountOptions = async () => mapAccountOptions(await fapiGet<FapiAccountOptions>('/compta/bank/fapi/account.php', { action: 'form_options' }))

export interface NewBankAccountBody {
  ref: string
  label: string
  type: string
  currencyCode: string
  closed: boolean
  countryId: string
  stateId: string
  url: string
  comment: string
  initialBalance: string
  date: string
  minAllowedBalance: string
  minDesiredBalance: string
  bankName: string
  accountNumber: string
  iban: string
  bic: string
  bankAddress: string
  ownerName: string
  ownerAddress: string
  accountingAccount: string
  accountingJournal: string
}

// ref, label and fk_accountancy_journal are the three fields the endpoint insists on (422 "... is required" otherwise); the other key names
// are the ones it answers to (an unknown key comes back in ignored_fields, which the probe on 26 Oct 2026 used to check each name).
export function accountCreateBody(i: NewBankAccountBody) {
  const text = (v: string) => v.trim()
  const balance = Number(i.initialBalance.replace(/,/g, '')) || 0
  return {
    ref: text(i.ref),
    label: text(i.label),
    type: Number(i.type),
    clos: i.closed ? 1 : 0,
    currency_code: i.currencyCode,
    country_id: Number(i.countryId),
    ...(i.stateId ? { state_id: Number(i.stateId) } : {}),
    url: text(i.url),
    comment: text(i.comment),
    ...(balance !== 0 ? { solde: balance, date_solde: i.date } : {}),
    min_allowed: text(i.minAllowedBalance),
    min_desired: text(i.minDesiredBalance),
    bank: text(i.bankName),
    number: text(i.accountNumber),
    iban: text(i.iban),
    bic: text(i.bic),
    domiciliation: text(i.bankAddress),
    proprio: text(i.ownerName),
    owner_address: text(i.ownerAddress),
    account_number: i.accountingAccount,
    fk_accountancy_journal: Number(i.accountingJournal),
  }
}

// The answer to a create is not documented (no account was created on the instance): the new id is looked for under the usual names.
export async function createBankAccount(i: NewBankAccountBody): Promise<number | undefined> {
  const d = await fapiPost<Record<string, unknown> | null>('/compta/bank/fapi/account.php', accountCreateBody(i), { action: 'create' })
  const id = d && (d.id ?? d.account_id ?? d.rowid)
  return typeof id === 'number' ? id : typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : undefined
}
