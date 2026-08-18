// Shared parsing for the legacy Dolibarr "Statistics" pages used by both
// Project Statistics (projet/stats/index.php) and Vendor Proposal
// Statistics (comm/propal/stats/index.php?mode=supplier) — both render the
// same shape: a Year filter, a results table, and 2-3 Chart.js charts whose
// full labels/datasets are embedded inline as real JS object literals in a
// <script> tag (not a static image) — verified live against the real
// backend. Extracting the real numbers out of that JS text (rather than
// re-fetching some separate chart-data endpoint, which doesn't exist) is
// what lets this render an actual chart instead of a blank placeholder.

export interface SelectOption {
  value: string
  label: string
}

export interface StatsResultsTable {
  headers: string[]
  rows: string[][]
}

export interface StatsChart {
  title: string
  labels: string[]
  datasets: { label: string; data: number[] }[]
}

function cellText(cell: Element | undefined | null): string {
  return (cell?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function parseYearOptions(doc: Document): SelectOption[] {
  const select = doc.querySelector<HTMLSelectElement>('select[name="year"]')
  if (!select) return []
  return Array.from(select.options).map((o) => ({ value: o.value, label: (o.textContent ?? '').trim() }))
}

export function parseResultsTable(doc: Document, expectedFirstHeader: string): StatsResultsTable | null {
  for (const table of Array.from(doc.querySelectorAll('table.newCustomUItable'))) {
    const headerRow = table.querySelector('tr')
    const headers = headerRow ? Array.from(headerRow.querySelectorAll('td')).map(cellText) : []
    if (headers[0] !== expectedFirstHeader) continue
    const rows: string[][] = []
    for (const tr of Array.from(table.querySelectorAll('tr')).slice(1)) {
      const cells = Array.from(tr.querySelectorAll('td')).map(cellText)
      if (cells.length) rows.push(cells)
    }
    return { headers, rows }
  }
  return null
}

function parseJsArray(text: string): string[] {
  const items: string[] = []
  const re = /'((?:[^'\\]|\\.)*)'|(-?\d+(?:\.\d+)?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) items.push(m[1] !== undefined ? m[1] : m[2])
  return items
}

export function parseEmbeddedCharts(doc: Document): StatsChart[] {
  const charts: StatsChart[] = []
  const titleDivs = Array.from(doc.querySelectorAll('.dolgraphtitle'))
  const scripts = Array.from(doc.querySelectorAll('script[id]')).filter((s) => (s.textContent ?? '').includes('new Chart('))

  scripts.forEach((script, i) => {
    const text = script.textContent ?? ''
    const dataBlockMatch = /data:\s*\{([\s\S]*?)\n\s*\}\s*\}\s*\)/.exec(text)
    const block = dataBlockMatch?.[1] ?? text
    const labelsMatch = /labels:\s*\[([^\]]*)\]/.exec(block)
    const labels = labelsMatch ? parseJsArray(labelsMatch[1]) : []

    const datasets: { label: string; data: number[] }[] = []
    const datasetRe = /\{[^{}]*?label:\s*'((?:[^'\\]|\\.)*)'[^{}]*?data:\s*\[([^\]]*)\][^{}]*?\}/g
    let m: RegExpExecArray | null
    while ((m = datasetRe.exec(block))) {
      datasets.push({ label: m[1], data: parseJsArray(m[2]).map(Number) })
    }

    charts.push({ title: titleDivs[i]?.textContent?.trim() ?? '', labels, datasets })
  })

  return charts
}

export function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.querySelector('select[name="year"]') && !!doc.querySelector('input[name="password"]')
}
