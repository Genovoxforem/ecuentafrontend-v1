// accountancy/expensereport/lines.php — "Bound lines of expense reports" (the
// expense report "Dispatched" screen). Confirmed live against 172.16.5.10
// (page, form, filters, 372-option account_parent select) and in the PHP
// source, which shows the row template. Same architecture as the customer
// lines.php: one POST form (token) around a table with a `changeaccount[]`
// checkbox per bound line; "Change the binding" posts the ticked ids plus
// account_parent and runs UPDATE expensereport_det SET fk_code_ventilation.
// Only approved/closed expense reports are listed. Columns are mapped by
// header text because the optional "Validation date" column may be present.

export interface BoundExpenseLine {
  lineId: string
  employee: string
  employeeId: string
  employeePhoto: string
  reportId: string
  reportRef: string
  validationDate: string
  date: string
  feeType: string
  description: string
  amount: string
  taxRate: string
  account: string
}

export interface BoundExpenseLinesPage {
  token: string
  info: string
  limit: number
  page: number
  pageCount: number
  accounts: { value: string; label: string }[] // includes "0" = --- None ---
  rows: BoundExpenseLine[]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const qs = (href: string | null | undefined, key: string) => new URLSearchParams((href ?? '').split('?')[1] ?? '').get(key) ?? ''

export function parseBoundExpenseLines(doc: Document): BoundExpenseLinesPage {
  const select = doc.querySelector('select[name="account_parent"]')
  const form = select?.closest('form') ?? null
  const val = (name: string) => form?.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? ''

  const accounts = Array.from(select?.querySelectorAll('option') ?? [])
    .map((o) => ({ value: o.value.trim(), label: text(o) }))
    .filter((o) => o.value !== '')

  const table = Array.from(form?.querySelectorAll('table') ?? []).find((t) => /Id\s*line/i.test(text(t)) && !t.querySelector('table'))
  const headRow = Array.from(table?.querySelectorAll('tr') ?? []).find((tr) => /^Employees/i.test(text(tr)))
  const heads = Array.from(headRow?.children ?? []).map((c) => text(c).toLowerCase())
  const idx = (re: RegExp) => heads.findIndex((h) => re.test(h))
  const i = {
    employee: idx(/^employee/),
    id: idx(/^id\s*line/),
    report: idx(/^expense report/),
    validation: idx(/validation/),
    date: idx(/^date of line/),
    fee: idx(/^types? of fees/),
    desc: idx(/^description/),
    amount: idx(/^amount/),
    tax: idx(/^tax rate/),
    account: idx(/^accounting account/),
  }

  const rows: BoundExpenseLine[] = []
  for (const check of Array.from(form?.querySelectorAll<HTMLInputElement>('input[name="changeaccount[]"]') ?? [])) {
    const c = Array.from(check.closest('tr')?.children ?? []) as HTMLElement[]
    if (c.length < heads.length - 1 || heads.length === 0) continue
    const at = (n: number) => (n >= 0 ? c[n] : undefined)
    const acc = at(i.account)?.cloneNode(true) as HTMLElement | undefined
    acc?.querySelectorAll('a[href*="card.php?id="]').forEach((a) => a.remove()) // drop the pencil link
    rows.push({
      lineId: check.value,
      employee: text(at(i.employee)),
      employeeId: qs(at(i.employee)?.querySelector('a')?.getAttribute('href'), 'id'),
      employeePhoto: at(i.employee)?.querySelector('img[src]')?.getAttribute('src') ?? '',
      reportId: qs(at(i.report)?.querySelector('a')?.getAttribute('href'), 'id'),
      reportRef: text(at(i.report)),
      validationDate: text(at(i.validation)),
      date: text(at(i.date)),
      feeType: text(at(i.fee)),
      description: text(at(i.desc)),
      amount: text(at(i.amount)),
      taxRate: text(at(i.tax)),
      account: text(acc),
    })
  }

  const pageNums = Array.from(doc.querySelectorAll('a[href*="page="]')).map((a) => Number(qs(a.getAttribute('href'), 'page')))
  const page = Number(val('page')) || 0
  return {
    token: val('token'),
    info: text(doc.querySelector('.info, .alert-info, .callout')),
    limit: Number(form?.querySelector<HTMLSelectElement>('select[name="limit"]')?.value) || 25,
    page,
    pageCount: Math.max(page, ...pageNums.filter((n) => Number.isFinite(n))) + 1,
    accounts,
    rows,
  }
}
