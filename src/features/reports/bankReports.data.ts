import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import type { ReportTable } from '../../shared/legacyReportTableParser'
import { fmt, num, usDate } from './reportFormat'

// Two Reports Center entries of "Bank And Asset Management", read from compta/bank/fapi/entries.php (the bank lines, newest first, with the
// balance of the account after each line) and list.php (the accounts). Compared with the classic pages on newecuenta on 10 Nov 2026 (GET):
//   Bank Summary (compta/bank/bankentries_list_rep.php): for 1-31 Oct 2026 the classic page lists 26 lines and a Total row (debit 4.00, credit
//     2,918.90); entries.php answers the same 26 lines, same ids, same amounts. The classic "Balance" column prints "-" on every line; here it is
//     the balance the API gives for the line.
//   Account Transactions (compta/resultat/bankentries_list.php): the classic page prints EVERY line twice (50 rows for the 25 lines of Cash_Account,
//     2 for the 1 line of Bank_Transer, one copy with the customer code as third party and one without), and its "Balance" adds both copies, so
//     it is not reproduced; each line is shown once, with the name of the third party. The classic page shows nothing until a bank is chosen.
// Which date the period filters (operation date or value date) could not be told apart: every line has the same two dates.

interface ApiEntry {
  id: number
  account_id: number
  account_ref: string
  date_operation: string
  date_value: string
  label: string
  payment_type_label: string | null
  num_chq: string | null
  num_releve: string | null
  debit: number | null
  credit: number | null
  cur_amount: number | null
  running_balance: number | null
  thirdparty: { id: number; name: string } | null
}

interface ApiEntries {
  entries: ApiEntry[]
  pagination: { page: number; page_count: number; total: number }
}

export interface BankReportEntry {
  id: number
  accountRef: string
  dateOperation: string
  dateValue: string
  label: string
  type: string
  number: string
  thirdParty: string
  debit: number | null
  credit: number | null
  conversion: number | null
  balance: number | null
  statement: string
}

const fromApi = (e: ApiEntry): BankReportEntry => ({
  id: e.id,
  accountRef: e.account_ref,
  dateOperation: e.date_operation,
  dateValue: e.date_value,
  label: e.label,
  type: e.payment_type_label ?? '',
  number: e.num_chq ?? '',
  thirdParty: e.thirdparty?.name ?? '',
  debit: e.debit,
  credit: e.credit,
  conversion: e.cur_amount,
  balance: e.running_balance,
  statement: e.num_releve ?? '',
})

// Every page (the endpoint's own ceiling is 1000 lines a page, pages count from 0) of the lines of a period, for one account or all of them.
export async function loadBankReportEntries(from: string, to: string, accountId?: number): Promise<BankReportEntry[]> {
  const read = (page: number) => fapiGet<ApiEntries>('/compta/bank/fapi/entries.php', { account: accountId || undefined, date_start: from, date_end: to, page, limit: 1000 })
  const first = await read(0)
  const out = [...first.entries]
  const pages = Math.min(first.pagination?.page_count ?? 1, 50)
  for (let page = 1; page < pages; page++) out.push(...(await read(page)).entries)
  return out.map(fromApi)
}

export interface BankChoice {
  id: number
  ref: string
  label: string
  currency: string
}

export async function loadBankChoices(): Promise<BankChoice[]> {
  const d = await fapiGet<{ accounts: BankChoice[]; currency_default?: string }>('/compta/bank/fapi/list.php')
  return d.accounts.map((a) => ({ id: a.id, ref: a.ref, label: a.label, currency: a.currency }))
}

export function useBankChoices() {
  return useQuery({ queryKey: ['reports', 'bankChoices'], queryFn: loadBankChoices, staleTime: 10 * 60_000 })
}

const money = (n: number | null) => (n === null ? '' : fmt(n))
const isoDay = (s: string) => s.slice(0, 10)

// Account Transactions: oldest line first, one row per line. The amounts carry the currency of the account in their headers.
export function mapBankEntriesReport(entries: BankReportEntry[], currency: string): ReportTable {
  const sorted = [...entries].sort((a, b) => (a.dateOperation === b.dateOperation ? a.id - b.id : a.dateOperation < b.dateOperation ? -1 : 1))
  return {
    headers: ['No', 'Description', 'Value Date', 'Third Party', `Debit (${currency})`, `Credit (${currency})`, `Balance (${currency})`],
    rows: sorted.map((e, i) => [String(i + 1), e.label, isoDay(e.dateValue), e.thirdParty, money(e.debit), money(e.credit), money(e.balance)]),
  }
}

// Bank Summary: newest line first (the order of the answer) and the Total row of debit and credit.
export function mapBankSummary(entries: BankReportEntry[]): ReportTable {
  const rows = entries.map((e) => [
    String(e.id),
    e.label,
    usDate(isoDay(e.dateOperation)),
    usDate(isoDay(e.dateValue)),
    e.type,
    e.number,
    e.thirdParty,
    e.accountRef,
    money(e.debit),
    money(e.credit),
    money(e.balance),
    money(e.conversion),
    e.statement,
  ])
  if (entries.length > 0) {
    const sum = (pick: (e: BankReportEntry) => number | null) => entries.reduce((s, e) => s + num(pick(e)), 0)
    rows.push(['Total', '', '', '', '', '', '', '', fmt(sum((e) => e.debit)), fmt(sum((e) => e.credit)), '', '', ''])
  }
  return { headers: ['Ref.', 'Description', 'Oper. Date', 'Value Date', 'Type', 'Number', 'Third-Party', 'Bank Account', 'Debit', 'Credit', 'Balance', 'Conversion Amount', 'Account Statement'], rows }
}

export function useBankReportEntries(from: string, to: string, accountId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'bankEntries', from, to, accountId ?? 0],
    queryFn: () => loadBankReportEntries(from, to, accountId),
    enabled,
    staleTime: 60_000,
  })
}
