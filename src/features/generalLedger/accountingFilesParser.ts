import { cellText } from './legacyTable'

// compta/accounting-files.php ("Export accounting source documents"). From the page's own PHP and
// live markup:
//   - a search form: the period and one toggle button per kind of document (`selectinvoices`,
//     `selectsupplierinvoices`, `selectexpensereports`, `selectdonations`, `selectsocialcontributions`,
//     `selectpaymentsofsalaries`, `selectvariouspayment`, `selectloanspayment`); a kind whose module
//     is off has no button. The period is read from `date_start` / `date_stop` (any date strtotime
//     understands); the page's own `newdatepicker` box is turned into those by its script;
//   - a search answers with the list (no paging), three total rows (income, outcome, balance) and a
//     second form `dl` whose hidden fields (token, dates as yyyymmdd, the chosen kinds) request the
//     ZIP of every listed document plus a `transactions.csv` when posted;
//   - on a development backend PHP warnings are printed as tables inside the result rows.

export interface AccountingFileChoice {
  name: string
  label: string
  checked: boolean
}

export interface AccountingFileLink {
  text: string
  // Root-relative as printed.
  href: string | null
}

export interface AccountingFileRow {
  type: string
  date: string
  dateDue: string
  ref: AccountingFileLink
  // Files attached to the source document (each one a download link).
  documents: AccountingFileLink[]
  paid: string
  totalHt: string
  totalTtc: string
  totalVat: string
  thirdParty: string
  code: string
  country: string
  vatId: string
  currency: string
}

export interface AccountingFileTotal {
  label: string
  ht: string
  ttc: string
  vat: string
}

export interface AccountingFilesPage {
  // "(Environment :Master entity)"
  environment: string
  choices: AccountingFileChoice[]
  // A search has been made (the result block is printed).
  searched: boolean
  // "01/01/2026 - 12/31/2026" over the result.
  period: string
  headers: string[]
  rows: AccountingFileRow[]
  totals: AccountingFileTotal[]
  // The hidden fields of the download form (token, date_start, date_stop, the chosen kinds).
  downloadFields: Record<string, string>
}

// PHP warnings ("( ! ) Warning: …") come as `<br /><font size='1'><table class='xdebug-error …'>…
// </table></font>`. A `<table>` inside a table row makes the HTML parser close the results table, so
// they have to go before the page is parsed.
export function stripPhpWarnings(html: string): string {
  return html.replace(/(?:<br\s*\/?>\s*)?<font size='1'><table class='xdebug-error[\s\S]*?<\/table><\/font>/g, '')
}

const links = (td: Element | undefined): AccountingFileLink[] =>
  Array.from(td?.querySelectorAll('a[href]') ?? [])
    // The preview icon next to a file name is a link with no text.
    .filter((a) => cellText(a) !== '')
    .map((a) => ({ text: cellText(a), href: a.getAttribute('href') }))

export function readAccountingFiles(doc: Document): AccountingFilesPage {
  const search = doc.querySelector('form[name="searchfiles"]')
  if (!search) throw new Error('The export form on this backend page was not recognised.')

  const choices: AccountingFileChoice[] = Array.from(search.querySelectorAll<HTMLInputElement>('input.btn-check')).map((box) => ({
    name: box.name,
    label: cellText(search.querySelector(`label[for="${box.id}"]`)),
    checked: box.checked,
  }))

  const download = doc.querySelector('form[name="dl"]')
  const downloadFields: Record<string, string> = {}
  download?.querySelectorAll<HTMLInputElement>('input[type="hidden"]').forEach((el) => {
    if (el.name) downloadFields[el.name] = el.value
  })

  const table = Array.from(doc.querySelectorAll('table.newCustomUItable')).find((t) => t.querySelector('th[title="Type"]'))
  const headers = Array.from(table?.querySelector('tr')?.children ?? [], (c) => cellText(c))

  const rows: AccountingFileRow[] = []
  for (const tr of Array.from(table?.querySelectorAll('tr.oddeven') ?? [])) {
    const tds = Array.from(tr.children)
    // "No item" is a single spanning cell.
    if (tds.length < 12) continue
    const refLinks = links(tds[3])
    rows.push({
      type: cellText(tds[0]),
      date: cellText(tds[1]),
      dateDue: cellText(tds[2]),
      ref: { text: cellText(tds[3]), href: refLinks[0]?.href ?? null },
      documents: links(tds[4]),
      paid: cellText(tds[5]),
      totalHt: cellText(tds[6]),
      totalTtc: cellText(tds[7]),
      totalVat: cellText(tds[8]),
      thirdParty: cellText(tds[9]),
      code: cellText(tds[10]),
      country: cellText(tds[11]),
      vatId: cellText(tds[12]),
      currency: cellText(tds[13]),
    })
  }

  const totals: AccountingFileTotal[] = Array.from(table?.querySelectorAll('tr.totalRow') ?? [], (tr) => {
    const c = Array.from(tr.children, (td) => cellText(td))
    return { label: c[0] ?? '', ht: c[1] ?? '', ttc: c[2] ?? '', vat: c[3] ?? '' }
  })

  return {
    environment: cellText(search.querySelector('label span.opacitymedium')),
    choices,
    searched: !!download,
    period: cellText(doc.querySelector('.dateSpace')),
    headers,
    rows,
    totals,
    downloadFields,
  }
}
