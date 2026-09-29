// compta/stats/index.php — "TURNOVER INVOICED" (Reporting > ReportTurnover).
// Confirmed live against 172.16.5.10 and in the PHP source: a read-only report
// driven by `newdatepicker` ("MM/dd/yyyy - MM/dd/yyyy") and `modecompta`
// (BOOKKEEPING — the default —, RECETTES-DEPENSES or CREANCES-DETTES). The
// table has one block of columns per year in the period: "Amount (inc. tax)"
// and "Delta" (Claims-and-debts mode adds "Amount (excl. tax)"), blocks are
// separated by an empty spacer column, then 12 month rows and a Total row.
// Columns are therefore discovered from the two header rows rather than fixed.

export interface TurnoverGroup {
  year: string
  labels: string[]
}

export interface TurnoverReport {
  title: string
  period: string
  start: string // MM/dd/yyyy
  end: string
  basis: string
  groups: TurnoverGroup[]
  months: { month: string; cells: string[] }[]
  totalLabel: string
  totals: string[]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const pad = (n: string) => n.padStart(2, '0')

// "1/01/2026 - 12/31/2026" (the page doesn't zero-pad the first month).
function splitRange(v: string): { start: string; end: string } {
  const m = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return m ? { start: `${pad(m[1])}/${pad(m[2])}/${m[3]}`, end: `${pad(m[4])}/${pad(m[5])}/${m[6]}` } : { start: '', end: '' }
}

export function parseTurnoverInvoiced(doc: Document): TurnoverReport {
  const table = Array.from(doc.querySelectorAll('table')).find((t) => !t.querySelector('table') && /^Month$/i.test(text(t.querySelectorAll('tr')[1]?.children[0])))
  const trs = Array.from(table?.querySelectorAll('tr') ?? [])

  // Expand the year header row by colspan so each column knows its year.
  const yearOfCol: string[] = []
  for (const c of Array.from(trs[0]?.children ?? [])) {
    const span = Number(c.getAttribute('colspan') ?? 1) || 1
    const t = text(c)
    for (let k = 0; k < span; k++) yearOfCol.push(/^\d{4}$/.test(t) ? t : '')
  }
  const labels = Array.from(trs[1]?.children ?? []).map((c) => text(c))
  // Data columns: labelled and under a year (blank labels are spacers).
  const dataCols = labels.map((l, i) => (i > 0 && l && yearOfCol[i] ? i : -1)).filter((i) => i >= 0)

  const groups: TurnoverGroup[] = []
  for (const i of dataCols) {
    const last = groups[groups.length - 1]
    if (last && last.year === yearOfCol[i]) last.labels.push(labels[i])
    else groups.push({ year: yearOfCol[i], labels: [labels[i]] })
  }

  const pick = (tr: Element) => {
    const c = Array.from(tr.children)
    return dataCols.map((i) => text(c[i]))
  }
  const totalRow = trs.find((tr) => tr.classList.contains('totalRow'))
  const range = splitRange(doc.querySelector<HTMLInputElement>('input[name="newdatepicker"]')?.value ?? '')

  return {
    title: text(doc.querySelector('.div_subhead')) || 'Turnover invoiced',
    period: text(doc.querySelector('.sub_head')).replace(/^For the years ending\s*/i, '').replace(/\s+/g, ' '),
    ...range,
    basis: doc.querySelector<HTMLInputElement>('input[name="modecompta"]')?.value ?? 'BOOKKEEPING',
    groups,
    months: trs.filter((tr) => tr.classList.contains('oddeven')).map((tr) => ({ month: text(tr.children[0]), cells: pick(tr) })),
    totalLabel: text(totalRow?.children[0]) || 'Total',
    totals: totalRow ? pick(totalRow) : [],
  }
}
