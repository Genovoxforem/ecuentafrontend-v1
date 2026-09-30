// compta/tva/index.php — "TAX REPORT BY MONTH". Confirmed live against
// 172.16.5.10: a read-only server-rendered report with three header-less-class
// tables — "Tax monthly" (Year / Tax sales / Tax purchases / Balance, one row
// per month plus Subtotal and "Total to pay"), "Tax paid" (Month / Claimed for
// the period / Paid during this period plus Total) and "Tax Balance" (label /
// amount pairs). Tables are found by their header text, not CSS class.

export interface VatMonthRow {
  label: string // e.g. "Apr 2026"
  month: string
  year: string
  sales: string
  purchases: string
  balance: string
}

export interface VatPaidRow {
  month: string
  claimed: string
  paid: string
}

export interface VatReportByMonth {
  title: string
  period: string
  months: VatMonthRow[]
  subtotal: { sales: string; purchases: string; balance: string } | null
  totalToPay: string
  paidRows: VatPaidRow[]
  paidTotal: { claimed: string; paid: string } | null
  balance: { label: string; value: string }[]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const cells = (tr: Element) => Array.from(tr.children).map((c) => text(c))

export function parseVatReportByMonth(doc: Document): VatReportByMonth {
  const tables = Array.from(doc.querySelectorAll('table')).filter((t) => !t.querySelector('table'))
  const byHeader = (re: RegExp) => tables.find((t) => re.test(text(t.querySelector('tr'))))

  const monthly = byHeader(/^Year\s*Tax sales/i)
  const paid = byHeader(/^Month\s*Claimed for the period/i)
  const balance = byHeader(/^Sale tax claimed/i)

  const months: VatMonthRow[] = []
  let subtotal: VatReportByMonth['subtotal'] = null
  let totalToPay = ''
  for (const tr of Array.from(monthly?.querySelectorAll('tr') ?? []).slice(1)) {
    const c = cells(tr)
    if (tr.classList.contains('totalRow')) {
      if (/subtotal/i.test(c[0] ?? '')) subtotal = { sales: c[1] ?? '', purchases: c[2] ?? '', balance: c[3] ?? '' }
      else totalToPay = c[c.length - 1] ?? ''
      continue
    }
    if (c.length < 4) continue
    const href = tr.querySelector('a')?.getAttribute('href') ?? ''
    const q = new URLSearchParams(href.split('?')[1] ?? '')
    months.push({ label: c[0], month: q.get('month') ?? '', year: q.get('year') ?? '', sales: c[1], purchases: c[2], balance: c[3] })
  }

  const paidRows: VatPaidRow[] = []
  let paidTotal: VatReportByMonth['paidTotal'] = null
  for (const tr of Array.from(paid?.querySelectorAll('tr') ?? []).slice(1)) {
    const c = cells(tr)
    if (tr.classList.contains('totalRow')) paidTotal = { claimed: c[1] ?? '', paid: c[2] ?? '' }
    else if (c.length >= 3) paidRows.push({ month: c[0], claimed: c[1], paid: c[2] })
  }

  const period = /For the period of\s*(.*?)\s*Tax monthly/i.exec(text(doc.body))?.[1] ?? ''

  return {
    title: doc.title.trim() || 'TAX REPORT BY MONTH',
    period: period === '-' ? '' : period,
    months,
    subtotal,
    totalToPay,
    paidRows,
    paidTotal,
    balance: Array.from(balance?.querySelectorAll('tr') ?? [])
      .map((tr) => cells(tr))
      .filter((c) => c.length >= 2)
      .map((c) => ({ label: c[0], value: c[1] })),
  }
}
