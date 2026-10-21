// Reads the classic home page (index.php → mainDashboard/index.php) into the
// figures it shows. That page is the legacy dashboard itself: every number on
// it is computed server-side by its own SQL (unpaid = validated standard
// invoices not yet paid, ZRA warnings, sales by customer country, fiscal-year
// analytics, …) and none of it has a JSON endpoint, so the React dashboard
// reads the page instead of re-deriving the same figures from the invoice
// lists. Selectors are the page's own erp-* widget classes
// (mainDashboard/erp_widgets.php), which are the same on every install seen
// so far even where the surrounding layout differs (ecnta10 wraps the KPI
// cards in .erp-kpi-grid, 172.16.5.10 in Bootstrap columns).
//
// Only a super-admin gets this page: index.php sends everyone else to
// userdashboard.php or the POS, so a document without the dashboard markup
// parses to null and the caller falls back to its own figures.

export interface DashTrend {
  percent: number
  up: boolean
}

export type DashKpiKey = 'todaySales' | 'todayPurchase' | 'unpaid' | 'zraSigned' | 'other'

export interface DashKpi {
  key: DashKpiKey
  label: string
  value: number | null
  // Currency code printed in front of the value ("ZMW 0.00"), empty for counts.
  currency: string
  meta: string
  trend: DashTrend | null
  // Bar heights (percent of the tallest month) of the card's mini chart.
  spark: number[]
}

export interface DashPeriodSeries {
  labels: string[]
  income: number[]
  sales: number[]
  orders: number[]
  customers: number[]
}

export type DashPeriod = 'today' | 'week' | 'month' | 'year'

export interface DashInvoiceRow {
  ref: string
  id: number | null
  href: string
  party: string
  partyId: number | null
  amount: number | null
  date: string
  status: string
  // N of the badge's badge-statusN class (0 draft, 1 not paid, 3 started, 4 validated, 6 paid, 8/9 abandoned).
  statusCode: number | null
}

export interface DashCountry {
  code: string
  name: string
  amount: number
  percent: number
}

export interface DashMarker {
  name: string
  coords: [number, number]
}

export interface DashLine {
  from: string
  to: string
}

export interface DashSide {
  donut: Array<{ label: string; count: number | null; percent: number }>
  tiles: Array<{ label: string; value: number }>
  summary: Array<{ label: string; value: number | null; currency: string; trend: DashTrend | null }>
  periods: Partial<Record<DashPeriod, DashPeriodSeries>>
  last7: DashInvoiceRow[]
  countries: DashCountry[]
  markers: DashMarker[]
  lines: DashLine[]
}

export interface DashBank {
  name: string
  id: number | null
  percent: number
  amount: number | null
}

export interface DashAttention {
  title: string
  sub: string
  count: number
  href: string
  variant: string
}

export interface DashQuickAction {
  label: string
  href: string
}

export interface LegacyHomeDashboard {
  cashSession: 'open' | 'closed' | null
  kpis: DashKpi[]
  sales: DashSide
  purchase: DashSide
  banks: DashBank[]
  attention: DashAttention[]
  quickActions: DashQuickAction[]
}

const text = (el: Element | null | undefined): string => el?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

// price() output ("1,182,606.00", "-76.00", "ZMW 116,094.00") or a plain count
// ("5816") as a number. The decimal mark is the last . or , followed by one or
// two digits; every other . or , is a thousands separator.
export function parseLegacyNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '')
  if (!/\d/.test(cleaned)) return null
  const decimal = /[.,](\d{1,2})$/.exec(cleaned)
  const whole = (decimal ? cleaned.slice(0, decimal.index) : cleaned).replace(/[.,]/g, '')
  const n = Number(decimal ? `${whole}.${decimal[1]}` : whole)
  return Number.isFinite(n) ? n : null
}

function currencyOf(raw: string): string {
  return /\b([A-Z]{3})\b/.exec(raw)?.[1] ?? ''
}

function trendOf(el: Element | null): DashTrend | null {
  if (!el) return null
  const percent = parseLegacyNumber(text(el))
  if (percent === null) return null
  return { percent, up: !el.className.includes('erp-trend--down') }
}

// Text of an element without the trend badge nested in it ("Income 100.0%" -> "Income").
function textWithoutTrend(el: Element | null): string {
  if (!el) return ''
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('.erp-trend').forEach((t) => t.remove())
  return text(copy)
}

function queryId(href: string, params: string[]): number | null {
  const query = href.split('?')[1] ?? ''
  const search = new URLSearchParams(query.replace(/&amp;/g, '&'))
  for (const p of params) {
    const v = search.get(p)
    if (v && /^\d+$/.test(v)) return Number(v)
  }
  return null
}

function kpiKey(label: string): DashKpiKey {
  const l = label.toLowerCase()
  if (l.includes('sales')) return 'todaySales'
  if (l.includes('purchase')) return 'todayPurchase'
  if (l.includes('unpaid')) return 'unpaid'
  if (l.includes('zra')) return 'zraSigned'
  return 'other'
}

function parseKpi(card: Element): DashKpi {
  const label = text(card.querySelector('.erp-metric__label'))
  const valueText = text(card.querySelector('.erp-metric__value'))
  return {
    key: kpiKey(label),
    label,
    value: parseLegacyNumber(valueText),
    currency: currencyOf(valueText),
    meta: textWithoutTrend(card.querySelector('.erp-metric__meta')),
    trend: trendOf(card.querySelector('.erp-metric__meta .erp-trend')),
    spark: Array.from(card.querySelectorAll('.erp-kpi-spark i'), (i) => Number(/height:\s*([\d.]+)%/.exec(i.getAttribute('style') ?? '')?.[1] ?? 0)),
  }
}

function parseInvoiceRow(tr: Element): DashInvoiceRow | null {
  const cells = tr.querySelectorAll(':scope > td')
  if (cells.length < 6) return null
  const refLink = cells[1].querySelector('a')
  const partyLink = cells[2].querySelector('a')
  const partyCopy = (partyLink ?? cells[2]).cloneNode(true) as Element
  partyCopy.querySelectorAll('.avatar-circle').forEach((a) => a.remove())
  const badge = cells[5].querySelector('.badge')
  const badgeCode = badge ? /badge-status(\d+)/.exec(badge.className) : null
  const viewHref = cells[6]?.querySelector('a')?.getAttribute('href') ?? ''
  const href = refLink?.getAttribute('href') ?? viewHref
  return {
    ref: text(refLink ?? cells[1]),
    id: queryId(href, ['facid', 'id']) ?? queryId(viewHref, ['facid', 'id']),
    href,
    party: text(partyCopy),
    partyId: partyLink ? queryId(partyLink.getAttribute('href') ?? '', ['socid', 'id']) : null,
    amount: parseLegacyNumber(text(cells[3])),
    date: text(cells[4]),
    status: text(badge ?? cells[5]),
    statusCode: badgeCode ? Number(badgeCode[1]) : null,
  }
}

function parseCountry(row: Element): DashCountry {
  const flag = row.querySelector('img')?.getAttribute('src') ?? ''
  return {
    code: /\/flags\/([a-z]{2})\.png/i.exec(flag)?.[1]?.toLowerCase() ?? '',
    name: text(row.querySelector('.erp-country-row__name')),
    amount: parseLegacyNumber(text(row.querySelector('.erp-country-row__amount'))) ?? 0,
    percent: parseLegacyNumber(text(row.querySelector('.erp-country-row__pct'))) ?? 0,
  }
}

// The JSON object or array that starts at `from` (the first { or [ there),
// cut out by matching brackets — the analytics data is printed as
// `sales: {…json…}, purchase: {…json…}` inside a JS object literal, so the
// whole literal is not JSON itself.
export function balancedJsonAt(source: string, from: number): string | null {
  const start = source.slice(from).search(/[[{]/)
  if (start < 0) return null
  let depth = 0
  let inString = false
  for (let i = from + start; i < source.length; i++) {
    const c = source[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return source.slice(from + start, i + 1)
    }
  }
  return null
}

function jsonAfter<T>(scripts: string, marker: RegExp): T | null {
  const m = marker.exec(scripts)
  if (!m) return null
  const json = balancedJsonAt(scripts, m.index + m[0].length)
  if (!json) return null
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

const numbers = (values: unknown): number[] => (Array.isArray(values) ? values.map((v) => Number(v) || 0) : [])

function toSeries(raw: unknown): DashPeriodSeries | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.labels)) return null
  return {
    labels: r.labels.map(String),
    income: numbers(r.income),
    sales: numbers(r.sales),
    orders: numbers(r.orders),
    customers: numbers(r.customers),
  }
}

function toPeriods(raw: unknown): Partial<Record<DashPeriod, DashPeriodSeries>> {
  const out: Partial<Record<DashPeriod, DashPeriodSeries>> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const period of ['today', 'week', 'month', 'year'] as const) {
    const series = toSeries((raw as Record<string, unknown>)[period])
    if (series) out[period] = series
  }
  return out
}

// The donut's own counts: `labels: [...]` and `data: [...]` of the chart
// whose dataset label is "Sales Distribution" / "Purchase Distribution".
function donutCounts(scripts: string, datasetLabel: string): number[] | null {
  const m = new RegExp(`label:\\s*"${datasetLabel}",\\s*data:\\s*\\[([^\\]]*)\\]`).exec(scripts)
  if (!m) return null
  return m[1]
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => Number(v) || 0)
}

function parseSide(pane: Element | null, dashboard: Element, scripts: string, kind: 'sales' | 'purchase'): DashSide {
  const counts = donutCounts(scripts, kind === 'sales' ? 'Sales Distribution' : 'Purchase Distribution')
  const legend = Array.from(pane?.querySelectorAll('.erp-donut-legend > span') ?? [])
  const donut = legend.map((span, i) => {
    const label = text(span).replace(/\s*-?\d+(?:[.,]\d+)?\s*%\s*$/, '')
    return { label, count: counts?.[i] ?? null, percent: parseLegacyNumber(/(-?\d+(?:[.,]\d+)?)\s*%\s*$/.exec(text(span))?.[1] ?? '') ?? 0 }
  })
  // The row count in the title is a per-install setting (MAIN_SIZE_SHORTLIST):
  // some installs print "Last 5 Sales", others "Last 7 Sales" — the number is
  // not the page's own, so it is matched generically rather than pinned to 7.
  // The title itself also isn't always `.erp-card__title`: 172.16.5.10 prints
  // the classic Bootstrap `.card-title` inside the same `.erp-card` instead.
  const lastCardTitle = kind === 'sales' ? /^last\s*\d+\s+sales\b/i : /^last\s*\d+\s+purchases?\b/i
  const lastCard = Array.from(dashboard.querySelectorAll('.erp-card')).find((card) =>
    lastCardTitle.test(text(card.querySelector('.erp-card__title, .card-title'))),
  )
  const markerVar = kind === 'sales' ? 'mapMarkers' : 'mappMarkers'
  const lineVar = kind === 'sales' ? 'mapLines' : 'mappLines'
  const paneScripts = Array.from(pane?.querySelectorAll('script') ?? [], (s) => s.textContent ?? '').join('\n')
  return {
    donut,
    tiles: Array.from(pane?.querySelectorAll('.erp-mini-tile') ?? [], (tile) => ({
      label: text(tile.querySelector('.erp-mini-tile__label')),
      value: parseLegacyNumber(text(tile.querySelector('.erp-mini-tile__value'))) ?? 0,
    })),
    summary: Array.from(pane?.querySelectorAll('.erp-sum-item') ?? [], (item) => {
      const valueText = text(item.querySelector('.erp-sum-item__value'))
      return {
        label: textWithoutTrend(item.querySelector('.erp-sum-item__label')),
        value: parseLegacyNumber(valueText),
        currency: currencyOf(valueText),
        trend: trendOf(item.querySelector('.erp-sum-item__label .erp-trend')),
      }
    }),
    periods: toPeriods(jsonAfter(scripts, new RegExp(`erpPeriodData\\s*=\\s*\\{[\\s\\S]*?\\b${kind}:\\s*`))),
    last7: Array.from(lastCard?.querySelectorAll('tbody > tr') ?? [])
      .map(parseInvoiceRow)
      .filter((r): r is DashInvoiceRow => r !== null),
    countries: Array.from(pane?.querySelectorAll('.erp-country-row') ?? [], parseCountry),
    markers: jsonAfter<DashMarker[]>(paneScripts, new RegExp(`const ${markerVar}\\s*=\\s*`)) ?? [],
    lines: jsonAfter<DashLine[]>(paneScripts, new RegExp(`const ${lineVar}\\s*=\\s*`)) ?? [],
  }
}

export function parseLegacyHomeDashboard(html: string): LegacyHomeDashboard | null {
  // Everything before the dashboard is the app shell's menus (~1 MB): leave it out of the parse.
  const start = html.search(/<div class="erp-dash[\s"]/)
  if (start < 0) return null
  const doc = new DOMParser().parseFromString(html.slice(start), 'text/html')
  const dash = doc.querySelector('.erp-dash')
  if (!dash) return null
  const scripts = Array.from(doc.querySelectorAll('script'), (s) => s.textContent ?? '').join('\n')
  const badge = text(dash.querySelector('.erp-session .erp-badge')).toLowerCase()
  return {
    cashSession: badge.includes('open') ? 'open' : badge.includes('closed') ? 'closed' : null,
    kpis: Array.from(dash.querySelectorAll('.erp-metric'), parseKpi),
    sales: parseSide(doc.getElementById('salesTab'), dash, scripts, 'sales'),
    purchase: parseSide(doc.getElementById('purchaseTab'), dash, scripts, 'purchase'),
    banks: Array.from(dash.querySelectorAll('.erp-bank-row'), (row) => {
      const link = row.querySelector('.erp-bank-row__name a')
      return {
        name: text(link),
        id: link ? queryId(link.getAttribute('href') ?? '', ['id']) : null,
        percent: parseLegacyNumber(text(row.querySelector('.erp-bank-row__pct'))) ?? 0,
        amount: parseLegacyNumber(text(row.querySelector('.erp-bank-row__amount'))),
      }
    }),
    attention: Array.from(dash.querySelectorAll('a.erp-attention__row'), (row) => ({
      title: text(row.querySelector('.erp-attention__title')),
      sub: text(row.querySelector('.erp-attention__sub')),
      count: parseLegacyNumber(text(row.querySelector('.erp-attention__count'))) ?? 0,
      href: row.getAttribute('href') ?? '',
      variant: /erp-attention__icon--(\w+)/.exec(row.querySelector('.erp-attention__icon')?.className ?? '')?.[1] ?? 'primary',
    })),
    quickActions: Array.from(dash.querySelectorAll('a.erp-qa-tile'), (tile) => ({
      label: text(tile.querySelector(':scope > span:last-child')) || text(tile),
      href: tile.getAttribute('href') ?? '',
    })),
  }
}
