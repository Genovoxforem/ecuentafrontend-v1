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



// ── Approvals ────────────────────────────────────────────────────────────────────────────────────────
export interface ApprovalRow {
  // The "#" the backend prints (its own order, kept however the table is sorted).
  n: number
  id: string
  ref: string
  // The report's type as the backend prints it: Employee, Internal, Customer or Vendor.
  type: string
  // Who created the report (the "Created By" column) and who approves it ("Approver", with the "Awaiting:" prefix while pending).
  employee: string
  approver: string
  period: string
  linkedTo: ExpenseParty | null
  totalTtc: string
  status: string
}



// ── Payments ─────────────────────────────────────────────────────────────────────────────────────────
// What the last cell offers: pay what is still owed, collect a surplus advance back, or nothing left.
export type PaymentAction = { kind: 'pay'; amount: number; label: string } | { kind: 'collect'; label: string } | { kind: 'settled'; label: string }

export interface PaymentRow {
  n: number
  id: string
  ref: string
  // The type badge (Expense Payment / Advance) and the employee.
  type: string
  employee: string
  period: string
  totalTtc: string
  advance: string
  netPayable: string
  netTone: 'owed' | 'surplus' | 'settled'
  totalPaid: string
  // The "Linked" cell: how many bank entries and attachments the report has ("-" when none).
  linked: string
  status: string
  paid: boolean
  action: PaymentAction
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


