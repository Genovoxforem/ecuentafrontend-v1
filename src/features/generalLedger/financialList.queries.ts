import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { FinancialListPage } from './financialList.types'

// accountancy/fapi/financial_closure.php?year= (key-authenticated JSON): the summary of the year, read live on newecuenta on 13 Nov 2026:
// {year, fiscal_year_ending, source_counts {sales, purchase, expense, bank}, journals, chart_of_accounts {opening {debit, credit, balance}, rows [{account,
// account_label, code_journal, debit, credit, balance}], grand_total}}. Compared with the classic accountancy/closure/financiallist.php for 2026:
//   - the account table is the same (10 / 101 / 1087 / 2042, same journals and amounts, Grand Total 51,000.00 / 51,000.00 / 0.00); the classic table starts
//     with an "Opening Balance (Previous Years)" row. The API used to list an account with no activity (411, journal AC, all zero) that the classic table
//     leaves out; since 11 Nov 2026 it does not;
//   - the classic "Created BY / Approved BY / Date / Comments" lines are blank there (no closing recorded) and the API has no field for them
//     (fiscal_year_ending is null);
//   - the "Total Sales / Purchase / Expences / Bank Entries" lines print the count and the money of each source: source_totals ({sales, purchase, expense,
//     bank {debit, credit}}, since 11 Nov 2026) sits next to source_counts, so the lines read "116 Bills - 215,308.79" and "81 Entries - D: 4.00 / C: 90,385.85"
//     (the classic wording). Against a server without source_totals the lines stay blank rather than show a count without its amount.
interface FinancialClosureAnswer {
  year: number
  source_counts?: { sales: number; purchase: number; expense: number; bank: number }
  source_totals?: { sales: number; purchase: number; expense: number; bank: { debit: number; credit: number } }
  chart_of_accounts: {
    opening: { debit: number; credit: number; balance: number }
    rows: Array<{ account: string; account_label: string; code_journal: string; debit: number; credit: number; balance: number }>
    grand_total: { debit: number; credit: number; balance: number }
  }
}

const bills = (count: number, amount: number) => `${count} Bills - ${formatMoney(amount)}`

// The "Invoices Created" lines of the classic panel: "N Bills - amount" for sales, purchases and expenses and "N Entries - D: debit / C: credit" for the bank.
export function closureSourceLines(d: Pick<FinancialClosureAnswer, 'source_counts' | 'source_totals'>): FinancialListPage['invoices'] {
  const n = d.source_counts
  const t = d.source_totals
  if (!n || !t) return { sales: '', purchase: '', expense: '', bank: '' }
  return {
    sales: bills(n.sales, t.sales),
    purchase: bills(n.purchase, t.purchase),
    expense: bills(n.expense, t.expense),
    bank: `${n.bank} Entries - D: ${formatMoney(t.bank.debit)} / C: ${formatMoney(t.bank.credit)}`,
  }
}

export const mapFinancialClosure = (d: FinancialClosureAnswer): FinancialListPage => {
  const c = d.chart_of_accounts
  return {
    year: String(d.year),
    createdBy: '',
    approvedBy: '',
    date: '',
    comments: '',
    invoices: closureSourceLines(d),
    headers: ['Account Number', 'Account Name', 'Journal Code', 'Total Debit', 'Total Credit', 'Balance'],
    rows: [
      [{ text: 'Opening Balance (Previous Years)', span: 3 }, ...[c.opening.debit, c.opening.credit, c.opening.balance].map((n) => ({ text: formatMoney(n), span: 1 }))],
      ...c.rows.map((r) => [r.account, r.account_label, r.code_journal, formatMoney(r.debit), formatMoney(r.credit), formatMoney(r.balance)].map((text) => ({ text, span: 1 }))),
    ],
    grandTotal: [{ text: 'Grand Total', span: 3 }, ...[c.grand_total.debit, c.grand_total.credit, c.grand_total.balance].map((n) => ({ text: formatMoney(n), span: 1 }))],
  }
}

export function useFinancialList(year: number) {
  return useQuery({
    queryKey: ['generalLedger', 'financialList', year],
    queryFn: async (): Promise<FinancialListPage> => mapFinancialClosure(await fapiGet<FinancialClosureAnswer>('/accountancy/fapi/financial_closure.php', { year })),
    staleTime: 1000 * 30,
  })
}
