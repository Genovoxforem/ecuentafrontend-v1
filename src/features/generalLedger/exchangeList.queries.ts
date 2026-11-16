import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import { usDateFromIso as usDate } from '../../utils/dates'
import { loadBindableAccounts } from './bindingFapi'
import type { ExchangeList, ExchangeRow } from './exchangeList.types'

// accountancy/fapi/fx_reval.php (key-authenticated, read-only; replaces exchange_list.php): foreign-currency ledger lines revalued at today's rate.
// Answer {items, pagination {page (from 0), limit, total, pages}, totals {debit, credit, gain_loss}, revaluation_date, base_currency, filters}; the filters
// are search_currency_code, date_start / date_end, account_end and page / limit. newecuenta has no foreign-currency line (the list is empty, 13 Nov 2026),
// so the item below is the one the API document gives from the code, NOT seen with a live row:
//   {id, piece_num, code_journal, doc_date, doc_ref, doc_type, fk_doc, numero_compte, account_label, currency_code, currency_amo, debit, cur_debit, credit,
//    cur_credit, amount, cur_montant, new_amount, revaluation_rate, gain_loss, trend}
// As the classic page prints it, the entered (foreign) amount comes first and the amount in the account currency under it. The classic "Exchange rate"
// column has no field in the item and is left blank.

export interface ExchangeFilters {
  currency: string
  // yyyy-mm-dd
  dateStart: string
  dateEnd: string
  account: string
}

export interface ExchangeRequest {
  filters: ExchangeFilters
  limit: number | null
  // 0-based
  page: number
}

interface FxItem {
  piece_num: string
  code_journal: string
  doc_date: string
  doc_ref: string
  numero_compte: string
  currency_code: string
  debit: number
  cur_debit: number
  credit: number
  cur_credit: number
  new_amount: number
  revaluation_rate: number
  gain_loss: number
  trend: 'up' | 'down' | string
}

interface FxAnswer {
  items: FxItem[]
  pagination: { page: number; limit: number; total: number; pages: number }
  totals: { debit: number; credit: number; gain_loss: number }
  revaluation_date: string
  base_currency: string
  filters: { currency: string; date_start: string | null; date_end: string | null; account_end: string }
}

const money = (n: number) => formatMoney(n)
const LIMITS = [25, 50, 100, 250, 500]

export function mapFxReval(d: FxAnswer, accountOptions: ExchangeList['accountOptions']): ExchangeList {
  const rows: ExchangeRow[] = d.items.map((i) => ({
    pieceNum: String(i.piece_num),
    journal: i.code_journal,
    date: usDate(i.doc_date),
    docRef: i.doc_ref,
    account: i.numero_compte,
    currency: i.currency_code,
    rate: '',
    debit: i.cur_debit ? money(i.cur_debit) : '',
    debitConverted: i.cur_debit ? money(i.debit) : '',
    credit: i.cur_credit ? money(i.cur_credit) : '',
    creditConverted: i.cur_credit ? money(i.credit) : '',
    newAmount: money(i.new_amount),
    revaluationRate: String(i.revaluation_rate),
    gainLoss: money(i.gain_loss),
    trend: i.trend === 'up' ? 'up' : i.trend === 'down' ? 'down' : 'none',
  }))
  return {
    headers: ['Num. Transaction', 'Date', 'Accounting Doc.', 'Account', 'Currency', 'Exchange rate', 'Debit', 'Credit', 'New accounting amount', 'Unrealized gain/loss'],
    rows,
    totals: { debit: money(d.totals.debit), credit: money(d.totals.credit) },
    filters: { currency: d.filters.currency, dateStart: d.filters.date_start ?? '', dateEnd: d.filters.date_end ?? '', account: d.filters.account_end, exchangeDate: d.revaluation_date },
    accountOptions,
    limit: d.pagination.limit,
    limitOptions: LIMITS,
    page: d.pagination.page,
    hasPrev: d.pagination.page > 0,
    hasNext: d.pagination.page + 1 < d.pagination.pages,
    period: d.revaluation_date ? `Revaluation at the rate of ${usDate(d.revaluation_date)} (${d.base_currency})` : '',
  }
}

export function fxParams(req: ExchangeRequest) {
  return {
    search_currency_code: req.filters.currency.trim() || undefined,
    date_start: req.filters.dateStart || undefined,
    date_end: req.filters.dateEnd || undefined,
    account_end: req.filters.account || undefined,
    limit: req.limit ?? undefined,
    page: req.page,
  }
}

export function useExchangeList(req: ExchangeRequest) {
  return useQuery({
    queryKey: ['generalLedger', 'exchangeList', req],
    queryFn: async (): Promise<ExchangeList> => {
      const [d, accounts] = await Promise.all([fapiGet<FxAnswer>('/accountancy/fapi/fx_reval.php', fxParams(req)), loadBindableAccounts().catch(() => [])])
      return mapFxReval(d, accounts.map((a) => ({ value: a.label.split(' - ')[0], label: a.label })))
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
