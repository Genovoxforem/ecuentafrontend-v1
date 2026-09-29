// compta/resultat/index.php — "BALANCE OF INCOME AND EXPENSES, BY YEAR" (the
// Reporting > MenuReportInOut screen). Confirmed live against 172.16.5.10:
// a read-only report whose main table has a two-level header (each year spans
// an Expense and an Income column), 12 month rows, a "Total" row and an
// "Accounting result" row (one value per year). `year` sets the LAST year
// shown (four years are always listed) and `modecompta` picks the basis:
// BOOKKEEPING (the page's own default), RECETTES-DEPENSES or CREANCES-DETTES.
// The page also carries six more summary tables in a hidden side panel; those
// are not part of this screen.

export interface YearColumn {
  year: string
}

export interface MonthRow {
  month: string
  // one entry per year, in header order
  values: { expense: string; income: string }[]
}

export interface IncomeExpenseByYear {
  title: string
  period: string
  years: string[]
  months: MonthRow[]
  totalLabel: string
  totals: { expense: string; income: string }[]
  resultLabel: string
  results: string[]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function parseIncomeExpenseByYear(doc: Document): IncomeExpenseByYear {
  const table = Array.from(doc.querySelectorAll('table')).find((t) => !t.querySelector('table') && /^Month$/i.test(text(t.querySelectorAll('tr')[1]?.children[0])))
  const trs = Array.from(table?.querySelectorAll('tr') ?? [])
  const years = Array.from(trs[0]?.children ?? [])
    .map((c) => text(c))
    .filter((t) => /^\d{4}$/.test(t))

  const pairs = (cells: Element[]) => years.map((_, i) => ({ expense: text(cells[1 + i * 2]), income: text(cells[2 + i * 2]) }))

  const months: MonthRow[] = trs
    .filter((tr) => tr.classList.contains('oddeven'))
    .map((tr) => {
      const c = Array.from(tr.children)
      return { month: text(c[0]), values: pairs(c) }
    })

  const totalRow = trs.find((tr) => tr.classList.contains('liste_total'))
  const resultRow = trs.find((tr) => tr.classList.contains('totalRow'))
  const tc = Array.from(totalRow?.children ?? [])
  const rc = Array.from(resultRow?.children ?? [])

  return {
    title: text(doc.querySelector('.div_subhead')) || 'Balance of income and expenses, by year',
    period: text(doc.querySelector('.sub_head')).replace(/^For the years ending\s*/i, ''),
    years,
    months,
    totalLabel: text(tc[0]) || 'Total',
    totals: pairs(tc),
    resultLabel: text(rc[0]) || 'Accounting result',
    results: years.map((_, i) => text(rc[1 + i])),
  }
}
