// accountancy/expensereport/list.php — "Lines of expense reports to bind" (the
// expense report "ToDispatch" screen). Confirmed live against 172.16.5.10
// (form, header and six real lines: 11 cells per row, the description cell
// keeps its full text in a tooltip): one POST form (hidden
// action=ventil + token, a Bind mass action) whose header is
//   Employee | Id line | Expense report | Date of line | Types of fees |
//   Description | Amount | Tax Rate | Accounting account suggested |
//   Bind line with the accounting account | [checkbox]
// Same architecture as customer/list.php: each line carries a select
// `codeventil<lineId>` pre-set to the suggested account and a checkbox
// `toselect[]`. Columns are found by header text.

export interface BindExpenseLine {
  lineId: string
  selectValue: string
  employee: string
  employeeId: string
  // The user's photo as the page prints it (`/viewimage.php?modulepart=userphoto…`), '' when there is none.
  employeePhoto: string
  reportId: string
  reportRef: string
  date: string
  feeType: string
  description: string
  amount: string
  taxRate: string
  suggestedAccount: string
  selectedAccount: string
  // The page prints the box already ticked for a line that has a suggested account.
  checked: boolean
}

export interface BindExpenseLinesPage {
  token: string
  info: string
  sortfield: string
  sortorder: string
  accounts: { value: string; label: string }[]
  rows: BindExpenseLine[]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const qs = (href: string | null | undefined, key: string) => new URLSearchParams((href ?? '').split('?')[1] ?? '').get(key) ?? ''

export function parseBindExpenseLines(doc: Document): BindExpenseLinesPage {
  const form = Array.from(doc.querySelectorAll('form')).find((f) => f.querySelector('select[name="massaction"]')) ?? null
  const val = (name: string) => form?.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? ''

  const firstSelect = form?.querySelector<HTMLSelectElement>('select[name^="codeventil"]')
  const accounts = Array.from(firstSelect?.options ?? []).map((o) => ({ value: o.value.trim(), label: text(o) }))

  const headRow = Array.from(form?.querySelectorAll('tr') ?? []).find((tr) => /^Employee/i.test(text(tr.children[0])) && /^Id\s*line/i.test(text(tr.children[1])))
  const heads = Array.from(headRow?.children ?? []).map((h) => text(h).toLowerCase())
  const idx = (re: RegExp, fallback: number) => {
    const i = heads.findIndex((h) => re.test(h))
    return i >= 0 ? i : fallback
  }
  const ix = {
    employee: idx(/^employee/, 0),
    id: idx(/^id\s*line/, 1),
    report: idx(/^expense report/, 2),
    date: idx(/^date of line/, 3),
    fee: idx(/^types? of fees/, 4),
    desc: idx(/^description/, 5),
    amount: idx(/^amount/, 6),
    tax: idx(/^tax rate/, 7),
    suggested: idx(/^accounting account sugg/, 8),
  }

  const rows: BindExpenseLine[] = []
  for (const tr of Array.from(form?.querySelectorAll('tr') ?? [])) {
    const select = tr.querySelector<HTMLSelectElement>('select[name^="codeventil"]')
    const check = tr.querySelector<HTMLInputElement>('input[name="toselect[]"]')
    if (!select || !check) continue
    const c = Array.from(tr.children) as HTMLElement[]
    rows.push({
      lineId: check.value.split('_')[0],
      selectValue: check.value,
      employee: text(c[ix.employee]),
      employeeId: qs(c[ix.employee]?.querySelector('a')?.getAttribute('href'), 'id'),
      employeePhoto: c[ix.employee]?.querySelector('img[src]')?.getAttribute('src') ?? '',
      reportId: qs(c[ix.report]?.querySelector('a')?.getAttribute('href'), 'id'),
      reportRef: text(c[ix.report]),
      date: text(c[ix.date]),
      feeType: text(c[ix.fee]),
      // the page truncates long descriptions and keeps the full text in a tooltip
      description: c[ix.desc]?.querySelector('[title]')?.getAttribute('title') ?? text(c[ix.desc]),
      amount: text(c[ix.amount]),
      taxRate: text(c[ix.tax]),
      suggestedAccount: text(c[ix.suggested]),
      // (a blank option has no value attribute here, so its value would be its non-breaking space)
      selectedAccount: select.value.trim(),
      checked: check.checked,
    })
  }

  return {
    token: val('token'),
    info: text(doc.querySelector('.info, .alert-info, .callout')),
    sortfield: val('sortfield'),
    sortorder: val('sortorder'),
    accounts,
    rows,
  }
}
