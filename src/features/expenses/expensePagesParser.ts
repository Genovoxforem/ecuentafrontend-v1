// The expense module's own pages (Dashboard, Approvals, Payments) are server-rendered PHP fragments
// served by expense/api/expense_content.php (`{ success, html }`). These parsers read the tables and
// numbers those fragments print, so the React pages show exactly what the backend shows.

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

const parseHtml = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// ── People and companies (Dolibarr's getNomUrl output) ───────────────────────────────────────────────
// A user link carries its hover card as an HTML string in `data-geo`: photo, status, then one
// `<b>Label:</b> value` line per fact. A company link is a plain link.
export interface ExpenseParty {
  kind: 'user' | 'company'
  icon: 'user' | 'building' | 'truck'
  id: string
  name: string
  href: string
  photo: string
  enabled: boolean | null
  facts: { label: string; value: string }[]
}

function readTooltip(tip: string): { photo: string; enabled: boolean | null; facts: { label: string; value: string }[] } {
  if (!tip) return { photo: '', enabled: null, facts: [] }
  const doc = parseHtml(tip)
  const box = doc.querySelector('.divtooltip')
  const badge = box?.querySelector('.badge')
  const status = (badge?.getAttribute('title') ?? text(badge)).toLowerCase()
  const facts: { label: string; value: string }[] = []
  // The lines are separated by <br>; the first one is the "User <status>" heading.
  for (const segment of (box?.innerHTML ?? '').split(/<br\s*\/?>/i).slice(1)) {
    const line = text(parseHtml(`<div>${segment}</div>`).body)
    const at = line.indexOf(':')
    if (at > 0) facts.push({ label: line.slice(0, at).trim(), value: line.slice(at + 1).trim() })
  }
  return { photo: doc.querySelector('img')?.getAttribute('src') ?? '', enabled: status ? status === 'enabled' : null, facts }
}

// null when the cell has no link (the backend prints an em dash for "not linked to anyone").
export function parseParty(html: string | Element | null | undefined): ExpenseParty | null {
  const root = typeof html === 'string' ? parseHtml(`<div>${html}</div>`).body : html
  const a = root?.querySelector('a')
  if (!a) return null
  const href = a.getAttribute('href') ?? ''
  const isUser = /userprofile|\/user\/card\.php/.test(href)
  const params = new URL(href, 'http://backend.invalid').searchParams
  const tip = readTooltip(a.getAttribute('data-geo') ?? '')
  const icon = root?.querySelector('.fa-truck') ? 'truck' : isUser ? 'user' : 'building'
  return { kind: isUser ? 'user' : 'company', icon, id: params.get('socid') ?? params.get('id') ?? '', name: text(a.querySelector('.usertext') ?? a), href, ...tip }
}

// ── Dashboard ────────────────────────────────────────────────────────────────────────────────────────
export interface DashboardKpi {
  label: string
  value: string
  currency: string
  sub: string
}
export interface DashboardBudget {
  label: string
  pct: number
  used: string
  budget: string
}
export interface DashboardRecent {
  id: string
  ref: string
  user: string
  amount: string
  status: string
  date: string
}
export interface ExpenseDashboard {
  kpis: DashboardKpi[]
  months: string[]
  trend: number[]
  typeLabels: string[]
  typeData: number[]
  currency: string
  budgetYear: string
  budgets: DashboardBudget[]
  recent: DashboardRecent[]
}

// The page hands its chart data to the browser as `EXPENSE_DASH_DATA = { months: [...], trend: [...], … }`.
// The arrays are PHP json_encode output, so each one parses as JSON.
export function scriptArray<T>(script: string, key: string): T[] {
  // Ends at the `],` / `]}` that closes the array, so a label containing "]" cannot cut it short.
  const m = script.match(new RegExp(`(?<![A-Za-z])${key}:\\s*(\\[.*?\\])(?=\\s*,\\s*\\w+:|\\s*\\})`))
  if (!m) return []
  try {
    return JSON.parse(m[1]) as T[]
  } catch {
    return []
  }
}

export function parseExpenseDashboard(html: string): ExpenseDashboard {
  const doc = parseHtml(html)
  const script =
    Array.from(doc.querySelectorAll('script'))
      .map((s) => s.textContent ?? '')
      .find((s) => s.includes('EXPENSE_DASH_DATA')) ?? ''

  const kpis = Array.from(doc.querySelectorAll('.ec-report-stats-content')).map((c) => {
    const value = c.querySelector('.ec-report-stats-value')
    const currency = text(value?.querySelector('.ec-report-stats-value-currency'))
    return {
      label: text(c.querySelector('.ec-report-stats-title')),
      value: text(value).replace(currency, '').trim(),
      currency,
      sub: text(c.querySelector('.ec-report-stats-sub')),
    }
  })

  const cards = Array.from(doc.querySelectorAll('.card'))
  const budgetCard = cards.find((c) => /Budget vs Used/.test(text(c.querySelector('.card-header'))))
  const budgets = Array.from(budgetCard?.querySelectorAll('.card-body .mb-3') ?? []).flatMap((row) => {
    const spans = row.querySelectorAll('.d-flex span')
    const m = text(spans[1]).match(/([\d.]+)%\s*\(([^/]+)\/\s*([^)]+)\)/)
    return m ? [{ label: text(spans[0]), pct: parseFloat(m[1]), used: m[2].trim(), budget: m[3].trim() }] : []
  })

  const recentCard = cards.find((c) => /Recent Expenses/.test(text(c.querySelector('.card-header'))))
  const recent = Array.from(recentCard?.querySelectorAll('tbody tr') ?? []).flatMap((tr) => {
    const c = tr.querySelectorAll('td')
    const a = c[0]?.querySelector('a')
    const id = a ? new URL(a.getAttribute('href') ?? '', 'http://backend.invalid').searchParams.get('id') : null
    return id ? [{ id, ref: text(a), user: text(c[1]), amount: text(c[2]), status: text(c[3]), date: text(c[4]) }] : []
  })

  return {
    kpis,
    months: scriptArray<string>(script, 'months'),
    trend: scriptArray<number>(script, 'trend'),
    typeLabels: scriptArray<string>(script, 'typeLabels'),
    typeData: scriptArray<number>(script, 'typeData'),
    currency: script.match(/currency:\s*'([^']*)'/)?.[1] ?? '',
    budgetYear: text(budgetCard?.querySelector('.card-header')).match(/\((\d{4})\)/)?.[1] ?? '',
    budgets,
    recent,
  }
}

// ── Approvals ────────────────────────────────────────────────────────────────────────────────────────
export interface ApprovalRow {
  // The "#" the backend prints (its own order, kept however the table is sorted).
  n: number
  id: string
  ref: string
  employee: string
  period: string
  linkedTo: ExpenseParty | null
  totalTtc: string
  status: string
}

const reportId = (a: Element | null | undefined) => (a ? new URL(a.getAttribute('href') ?? '', 'http://backend.invalid').searchParams.get('id') : null)

export function parseApprovals(html: string): ApprovalRow[] {
  return Array.from(parseHtml(html).querySelectorAll('#approvals-table tbody tr')).flatMap((tr) => {
    const c = tr.querySelectorAll('td')
    const id = reportId(c[1]?.querySelector('a'))
    return id ? [{ n: Number(text(c[0])) || 0, id, ref: text(c[1]), employee: text(c[2]), period: text(c[3]), linkedTo: parseParty(c[4]), totalTtc: text(c[5]), status: text(c[6]) }] : []
  })
}

// ── Payments ─────────────────────────────────────────────────────────────────────────────────────────
// What the last cell offers: pay what is still owed, collect a surplus advance back, or nothing left.
export type PaymentAction = { kind: 'pay'; amount: number; label: string } | { kind: 'collect'; label: string } | { kind: 'settled'; label: string }

export interface PaymentRow {
  n: number
  id: string
  ref: string
  employee: string
  period: string
  totalTtc: string
  advance: string
  netPayable: string
  netTone: 'owed' | 'surplus' | 'settled'
  totalPaid: string
  status: string
  paid: boolean
  action: PaymentAction
}

export function parsePayments(html: string): { rows: PaymentRow[]; note: string } {
  const doc = parseHtml(html)
  const rows = Array.from(doc.querySelectorAll('#payments-table tbody tr')).flatMap((tr): PaymentRow[] => {
    const c = tr.querySelectorAll('td')
    const id = reportId(c[1]?.querySelector('a'))
    if (!id) return []
    const net = c[6]
    const button = c[10]?.querySelector('button')
    const collect = c[10]?.querySelector('a')
    // openPaymentModal(<id>, '<ref>', <amount still payable>)
    const amount = parseFloat(button?.getAttribute('onclick')?.match(/,\s*(-?[\d.]+)\s*\)/)?.[1] ?? '')
    const action: PaymentAction =
      button && Number.isFinite(amount) ? { kind: 'pay', amount, label: text(button) } : collect ? { kind: 'collect', label: text(collect) } : { kind: 'settled', label: text(c[10]) }
    return [
      {
        n: Number(text(c[0])) || 0,
        id,
        ref: text(c[1]),
        employee: text(c[2]),
        period: text(c[3]),
        totalTtc: text(c[4]),
        advance: text(c[5]),
        netPayable: text(net),
        netTone: net?.classList.contains('text-warning') ? 'surplus' : net?.classList.contains('text-primary') ? 'owed' : 'settled',
        totalPaid: text(c[7]),
        status: text(c[8]),
        paid: /^paid$/i.test(text(c[9])),
        action,
      },
    ]
  })
  return { rows, note: text(doc.querySelector('.alert-info')) }
}

// ── New expense form ─────────────────────────────────────────────────────────────────────────────────
// The form's dropdowns are printed with their real options: who the report is for, who approves it, the
// VAT rates, open projects, vendors and products.
export interface FormOption {
  value: string
  label: string
  selected: boolean
}
export interface ExpenseCreateForm {
  authors: FormOption[]
  validators: FormOption[]
  vatRates: FormOption[]
  projects: FormOption[]
  vendors: FormOption[]
  products: FormOption[]
  currency: string
}

function selectOptions(doc: Document, selector: string): FormOption[] {
  // Option values on this backend can be a non-breaking space (see the notes on blank options) — trim them.
  return Array.from(doc.querySelectorAll(`${selector} option`)).map((o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: text(o), selected: o.hasAttribute('selected') }))
}

export function parseExpenseCreateForm(html: string): ExpenseCreateForm {
  const doc = parseHtml(html)
  return {
    authors: selectOptions(doc, 'select#fk_user_author'),
    validators: selectOptions(doc, 'select#fk_user_validator'),
    vatRates: selectOptions(doc, 'select#vatrate'),
    projects: selectOptions(doc, 'select#fk_project'),
    vendors: selectOptions(doc, 'select#et_vendor_select'),
    products: selectOptions(doc, 'select#idprod'),
    // "<span id="total-ttc">0.00</span> ZMW"
    currency: text(doc.querySelector('#total-ttc')?.parentElement)
      .replace(/^[\d.,\s]+/, '')
      .trim(),
  }
}
