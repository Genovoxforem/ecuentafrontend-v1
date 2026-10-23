import { fapiGet } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { LegacyCell, LegacyFilter, LegacyTable } from './legacyTable'

// The special-payment lists on compta/sociales|tva|bank/various_payment/fapi, salaries/fapi, loan/fapi and don/fapi (22 Oct 2026), shown as
// the tables the list pages already render. Every list is empty on newecuenta (tests/fixtures/accountancy-*-list.json hold the real empty
// answers), so the item shapes below are the document's own ("Item shape, from code") and have not been seen with live rows.

const cell = (text: string | number | null | undefined): LegacyCell => ({ text: text == null ? '' : String(text), href: null, checkId: null })
const money = (n: number | null | undefined) => formatMoney(n ?? 0)
const textFilter = (name: string, params: Record<string, string>): LegacyFilter => ({ name, kind: 'text', value: params[name] ?? '', options: [] })
const bank = (b: { ref?: string; label?: string } | null | undefined) => (b ? [b.ref, b.label].filter(Boolean).join(' - ') : '')
const pageParams = (p: Record<string, string>, base: 0 | 1) => ({ page: Number(p.page ?? 0) + base, limit: Number(p.limit ?? 25) })

interface BankAccount { id: number; ref: string; label: string }

// ---- Social / fiscal taxes: compta/sociales/fapi/list.php ------------------------------------------------------------------------

export interface FapiSocialCharges {
  items: Array<{
    id: number; ref: string; label: string; type_id: number; type_label: string; project: { id: number; ref: string; label: string } | null
    date_ech: string | null; period: string | null; amount: number; already_paid: number; remaining: number; paye: number; status: 'paid' | 'started' | 'unpaid'
  }>
  totals: { amount: number; already_paid: number }
}

const STATUS = { paid: 'Paid', started: 'Started', unpaid: 'Unpaid' } as const

export function mapSocialCharges(d: FapiSocialCharges, params: Record<string, string> = {}): LegacyTable {
  const headers = ['Ref', 'Label', 'Type', 'Project', 'Due date', 'Period', 'Amount', 'Already paid', 'Status']
  return {
    headers,
    filters: [textFilter('search_ref', params), textFilter('search_label', params), null, null, null, null, textFilter('search_amount', params), null, null],
    rows: d.items.map((c) => [cell(c.ref), cell(c.label), cell(c.type_label), cell(c.project ? `${c.project.ref} - ${c.project.label}` : ''), cell(c.date_ech), cell(c.period), cell(money(c.amount)), cell(money(c.already_paid)), cell(STATUS[c.status] ?? c.status)]),
    totals: d.items.length ? [[cell('Total'), cell(''), cell(''), cell(''), cell(''), cell(''), cell(money(d.totals.amount)), cell(money(d.totals.already_paid)), cell('')]] : [],
    fields: {},
  }
}

export const loadSocialCharges = async (p: Record<string, string>) =>
  mapSocialCharges(await fapiGet<FapiSocialCharges>('/compta/sociales/fapi/list.php', { ...pageParams(p, 0), search_ref: p.search_ref, search_label: p.search_label, search_amount: p.search_amount }), p)

// ---- Social / fiscal tax payments: compta/sociales/fapi/payments.php --------------------------------------------------------------

export interface FapiSocialPayments {
  items: Array<{
    payment_id: number; charge_id: number; charge_label: string; type_id: number; type_label: string; period: string | null; date_ech: string | null
    expected: number; payment_date: string | null; payment_type_code: string | null; num_payment: string | null; bank_account: BankAccount | null; paid: number
  }>
  totals: { paid: number }
}

export function mapSocialPayments(d: FapiSocialPayments): LegacyTable {
  return {
    headers: ['End date for period', 'Label', 'Type', 'Expected', 'Payment date', 'Payment type', 'Number', 'Bank account', 'Paid'],
    filters: [],
    rows: d.items.map((x) => [cell(x.period), cell(x.charge_label), cell(x.type_label), cell(money(x.expected)), cell(x.payment_date), cell(x.payment_type_code), cell(x.num_payment), cell(bank(x.bank_account)), cell(money(x.paid))]),
    totals: d.items.length ? [[cell('Total'), cell(''), cell(''), cell(''), cell(''), cell(''), cell(''), cell(''), cell(money(d.totals.paid))]] : [],
    fields: {},
  }
}

export const loadSocialPayments = async (p: Record<string, string>) => mapSocialPayments(await fapiGet<FapiSocialPayments>('/compta/sociales/fapi/payments.php', pageParams(p, 0)))

// ---- Sales tax (VAT) payments: compta/tva/fapi/list.php --------------------------------------------------------------------------

export interface FapiVatPayments {
  items: Array<{
    id: number; ref: string; label: string; date_period_end: string | null; date_payment: string | null; payment_type_code: string | null
    num_payment: string | null; fk_bank: number | null; bank_account: BankAccount | null; amount: number
  }>
  totals: { amount: number }
}

export function mapVatPayments(d: FapiVatPayments, params: Record<string, string> = {}): LegacyTable {
  return {
    headers: ['Ref', 'Label', 'End date for period', 'Payment date', 'Payment type', 'Number', 'Bank account', 'Amount'],
    filters: [textFilter('search_ref', params), textFilter('search_label', params), null, null, null, textFilter('search_cheque', params), null, textFilter('search_amount', params)],
    rows: d.items.map((v) => [cell(v.ref), cell(v.label), cell(v.date_period_end), cell(v.date_payment), cell(v.payment_type_code), cell(v.num_payment), cell(bank(v.bank_account)), cell(money(v.amount))]),
    totals: d.items.length ? [[cell('Total'), cell(''), cell(''), cell(''), cell(''), cell(''), cell(''), cell(money(d.totals.amount))]] : [],
    fields: {},
  }
}

export const loadVatPayments = async (p: Record<string, string>) =>
  mapVatPayments(await fapiGet<FapiVatPayments>('/compta/tva/fapi/list.php', { ...pageParams(p, 0), search_ref: p.search_ref, search_label: p.search_label, search_cheque: p.search_cheque, search_amount: p.search_amount }), p)

// ---- Miscellaneous payments: compta/bank/various_payment/fapi/list.php ------------------------------------------------------------

export interface FapiVariousPayments {
  items: Array<{
    id: number; ref: string; label: string; date_payment: string | null; date_value: string | null; sens: number; payment_type_code: string | null
    num_payment: string | null; fk_bank: number | null; bank_account: BankAccount | null; accountancy_code: string | null; subledger_account: string | null
    debit: number; credit: number
  }>
  totals: { debit: number; credit: number }
}

export function mapVariousPayments(d: FapiVariousPayments, params: Record<string, string> = {}): LegacyTable {
  return {
    headers: ['Ref', 'Label', 'Payment date', 'Value date', 'Payment type', 'Number', 'Bank account', 'Account', 'Subledger account', 'Debit', 'Credit'],
    filters: [textFilter('search_ref', params), textFilter('search_label', params), null, null, null, null, null, textFilter('search_accountancy_account', params), textFilter('search_accountancy_subledger', params), textFilter('search_amount_deb', params), textFilter('search_amount_cred', params)],
    rows: d.items.map((v) => [cell(v.ref), cell(v.label), cell(v.date_payment), cell(v.date_value), cell(v.payment_type_code), cell(v.num_payment), cell(bank(v.bank_account)), cell(v.accountancy_code), cell(v.subledger_account), cell(v.debit ? money(v.debit) : ''), cell(v.credit ? money(v.credit) : '')]),
    totals: d.items.length ? [[cell('Total'), ...Array(8).fill(cell('')), cell(money(d.totals.debit)), cell(money(d.totals.credit))]] : [],
    fields: {},
  }
}

export const loadVariousPayments = async (p: Record<string, string>) =>
  mapVariousPayments(
    await fapiGet<FapiVariousPayments>('/compta/bank/various_payment/fapi/list.php', {
      ...pageParams(p, 0),
      search_ref: p.search_ref, search_label: p.search_label, search_amount_deb: p.search_amount_deb, search_amount_cred: p.search_amount_cred,
      search_accountancy_account: p.search_accountancy_account, search_accountancy_subledger: p.search_accountancy_subledger,
    }),
    p,
  )

// ---- Salary payments: salaries/fapi/list.php (page is 1-based) --------------------------------------------------------------------

export interface FapiSalaries {
  items: Array<{
    id: number; ref: string; label: string; employee: { id: number; login: string; name: string }; date_payment: string | null; date_value: string | null
    date_start_period: string | null; date_end_period: string | null; amount: number; num_payment: string | null
    payment_mode: { id: number; code: string; label: string } | null; bank_account: BankAccount | null
  }>
  totals: { count: number; amount: number; currency: string }
}

export function mapSalaries(d: FapiSalaries, params: Record<string, string> = {}): LegacyTable {
  return {
    headers: ['Ref', 'Label', 'Employee', 'Payment date', 'Start of period', 'End of period', 'Payment type', 'Number', 'Bank account', 'Amount'],
    filters: [textFilter('search', params), null, null, null, null, null, null, null, null, null],
    rows: d.items.map((s) => [cell(s.ref), cell(s.label), cell(s.employee?.name), cell(s.date_payment), cell(s.date_start_period), cell(s.date_end_period), cell(s.payment_mode?.label), cell(s.num_payment), cell(bank(s.bank_account)), cell(money(s.amount))]),
    totals: d.items.length ? [[cell('Total'), ...Array(8).fill(cell('')), cell(money(d.totals.amount))]] : [],
    fields: {},
  }
}

export const loadSalaries = async (p: Record<string, string>) => mapSalaries(await fapiGet<FapiSalaries>('/salaries/fapi/list.php', { ...pageParams(p, 1), search: p.search }), p)

// ---- Loans: loan/fapi/list.php (page is 1-based) -----------------------------------------------------------------------------------

export interface FapiLoans {
  items: Array<{
    id: number; ref: string; label: string; capital: number; nbterm: number; date_start: string | null; date_end: string | null
    paid_capital: number; remaining: number; status_label: string
  }>
  totals: { count: number; capital: number; paid_capital: number; remaining: number; currency: string }
}

export function mapLoans(d: FapiLoans, params: Record<string, string> = {}): LegacyTable {
  return {
    headers: ['Ref', 'Label', 'Capital', 'Terms', 'Start date', 'End date', 'Paid', 'Remaining', 'Status'],
    filters: [textFilter('search', params), null, null, null, null, null, null, null, null],
    rows: d.items.map((l) => [cell(l.ref), cell(l.label), cell(money(l.capital)), cell(l.nbterm), cell(l.date_start), cell(l.date_end), cell(money(l.paid_capital)), cell(money(l.remaining)), cell(l.status_label)]),
    totals: d.items.length ? [[cell('Total'), cell(''), cell(money(d.totals.capital)), cell(''), cell(''), cell(''), cell(money(d.totals.paid_capital)), cell(money(d.totals.remaining)), cell('')]] : [],
    fields: {},
  }
}

export const loadLoans = async (p: Record<string, string>) => mapLoans(await fapiGet<FapiLoans>('/loan/fapi/list.php', { ...pageParams(p, 1), search: p.search }), p)

// ---- Donations: don/fapi/list.php (page is 1-based) --------------------------------------------------------------------------------

export interface FapiDonations {
  items: Array<{ id: number; ref: string; date: string | null; amount: number; company: string; name: string; status_label: string; payment_mode: { label: string } | null; project_ref: string | null }>
  totals: { count: number; amount: number; currency: string }
}

export function mapDonations(d: FapiDonations, params: Record<string, string> = {}): LegacyTable {
  return {
    headers: ['Ref', 'Company', 'Name', 'Date', 'Payment type', 'Project', 'Amount', 'Status'],
    filters: [textFilter('search', params), textFilter('company', params), textFilter('name', params), null, null, null, textFilter('amount', params), null],
    rows: d.items.map((x) => [cell(x.ref), cell(x.company), cell(x.name), cell(x.date), cell(x.payment_mode?.label), cell(x.project_ref), cell(money(x.amount)), cell(x.status_label)]),
    totals: d.items.length ? [[cell('Total'), cell(''), cell(''), cell(''), cell(''), cell(''), cell(money(d.totals.amount)), cell('')]] : [],
    fields: {},
  }
}

export const loadDonations = async (p: Record<string, string>) =>
  mapDonations(await fapiGet<FapiDonations>('/don/fapi/list.php', { ...pageParams(p, 1), search: p.search, company: p.company, name: p.name, amount: p.amount }), p)
