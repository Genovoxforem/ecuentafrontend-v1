import type { AnalyticsPage, ReportsPage } from './expenseTabs.types'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { fapiGet } from '../../api/fapiEnvelope'
import { getProductFormOptions } from '../../api/products'
import type { EntityOption, ExpenseListFilters, ExpenseReportRow, ExpenseTypeOption } from './expenses.queries'
import type { ExpenseCardAction, ExpenseCardLine, ExpenseCardPage, ExpenseCardPerson } from './expenseCard.types'
import { dmy } from './expenseFormat'
import {
  parseParty,
  type ApprovalRow,
  type DashboardKpi,
  type ExpenseCreateForm,
  type ExpenseDashboard,
  type FormOption,
  type PaymentRow,
} from './expensePagesParser'

// The Expense module reads only endpoints that answer JSON. expense/fapi/* is a 404 on every backend checked (newecuenta, 5.10, 5.55, demo,
// 13 Nov 2026), so it is not called. What answers JSON on newecuenta and 5.10 (all read with GET and the session cookie):
//   - expense/ajax/expense_list.php         DataTables feed of the expense reports (POST: draw / start / length / filter_status / search)
//   - expense/api/expense_types.php?q=      {success, results:[{id, text}]}
//   - expense/ajax/entity_search.php        user / customer / vendor pickers (POST: type, q)
//   - expense/api/expense.php?action=summary   {total, draft, pending_approval, pending_payment, paid, total_amount, pending_amount, budget_*}
//   - expense/api/documents.php?action=list&id=   the files attached to a report
// Advances, Reimbursements, Repayments, Recurring, Reports, Analytics and Budgets exist on the backend only as HTML fragments (or not at all),
// so they have no source here and say so.

async function getJson<T>(url: string, form?: URLSearchParams): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    ...(form ? { method: 'POST', body: form } : {}),
  })
  if (!res.ok) throw new Error(`The backend answered ${res.status}.`)
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('The backend did not answer with data.')
  }
}

// A page the backend has no JSON for: refused at once (httpStatus 404 is never retried by the query client) with a plain message.
export const notAvailable = (what: string) =>
  Object.assign(new Error(`${what} ${/s$/.test(what) ? 'are' : 'is'} not available on this backend yet.`), { httpStatus: 404 })

const stripTags = (html: string) =>
  (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const num = (s: string) => parseFloat(String(s ?? '').replace(/,/g, '')) || 0
const money2 = (n: number) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

// ---- the report list ------------------------------------------------------------------------------------------------------------------
interface RawListResponse {
  recordsTotal: number
  recordsFiltered: number
  aaData: Array<{
    ref: string
    rowid: number | string
    linked_to: string
    user: string
    date_debut: string
    date_fin: string
    date_create: string
    total_ht: string
    total_tva: string
    total_ttc: string
    status: string
    paid: string
    notes: string
  }>
  error?: string
}

export async function readExpenseList(filters: ExpenseListFilters, page: number, length: number) {
  const query = new URLSearchParams({
    draw: '1',
    start: String(page * length),
    length: String(length),
  })
  if (filters.status) query.set('filter_status', filters.status)
  if (filters.dateFrom) query.set('filter_date_from', filters.dateFrom)
  if (filters.dateTo) query.set('filter_date_to', filters.dateTo)
  if (filters.search) query.set('search[value]', filters.search)
  if (filters.orderBy) {
    query.set('order[0][column]', '0')
    query.set('order[0][dir]', filters.orderDir ?? 'desc')
    query.set('columns[0][data]', filters.orderBy)
  }
  // The feed reads its paging, search and status filter from a POST body (a GET answers the first 20 rows, unfiltered): checked on 5.10.
  const data = await getJson<RawListResponse>('/expense/ajax/expense_list.php', query)
  if (data.error) throw new Error(data.error)
  const rows: ExpenseReportRow[] = data.aaData.map((r) => ({
    id: Number(r.rowid),
    ref: stripTags(r.ref),
    linkedTo: stripTags(r.linked_to),
    user: stripTags(r.user),
    dateStart: r.date_debut,
    dateEnd: r.date_fin,
    dateCreate: r.date_create,
    totalHt: r.total_ht,
    totalTva: r.total_tva,
    totalTtc: r.total_ttc,
    status: stripTags(r.status),
    paid: stripTags(r.paid).toLowerCase() === 'paid',
    notes: r.notes,
    userParty: parseParty(r.user),
    linkedParty: parseParty(r.linked_to),
  }))
  return { rows, total: data.recordsTotal, filtered: data.recordsFiltered }
}

export async function readExpenseTypes(): Promise<ExpenseTypeOption[]> {
  const data = await getJson<{
    success: boolean
    results: Array<{ id: number | string; text: string }>
  }>('/expense/api/expense_types.php?q=')
  if (!data.success) throw new Error('The backend refused the expense types request.')
  return data.results.map((r) => ({ id: Number(r.id), label: r.text }))
}

// A POST: the picker's search term is read from the body (a GET ignores q and always answers the first 30), and 30 is the most it returns.
export async function readEntities(type: 'user' | 'customer' | 'vendor', q: string): Promise<EntityOption[]> {
  return (await getJson<{ results: EntityOption[] }>('/expense/ajax/entity_search.php', new URLSearchParams({ type, q }))).results
}

// ---- documents of a report -----------------------------------------------------------------------------------------------------------
export interface ExpenseDocumentsAnswer {
  files: Array<{
    name: string
    size: string
    date: string
    ext: string
    downloadUrl: string
    thumbUrl: string
  }>
  totalSize: string
}
export async function readExpenseDocuments(id: string): Promise<ExpenseDocumentsAnswer> {
  const body = await getJson<{
    success: boolean
    message?: string
    data?: {
      files?: Array<{
        name: string
        size_formatted: string
        date: string
        ext: string
        download_url: string
        thumb_url: string
      }>
      total_size_formatted?: string
    }
  }>(`/expense/api/documents.php?${new URLSearchParams({ action: 'list', id })}`)
  if (!body.success) throw new Error(body.message || 'Could not load the documents.')
  return {
    files: (body.data?.files ?? []).map((f) => ({
      name: f.name,
      size: f.size_formatted,
      date: f.date,
      ext: f.ext,
      downloadUrl: f.download_url,
      thumbUrl: f.thumb_url ?? '',
    })),
    totalSize: body.data?.total_size_formatted ?? '',
  }
}

// ---- dashboard, approvals, payments: built from the summary and the report list ---------------------------------------------------------
interface Summary {
  total: number
  draft: number
  pending_approval: number
  pending_payment: number
  paid: number
  total_amount: number
  pending_amount: number
  budget_total: number
  budget_used: number
}
export async function readSummary(): Promise<Summary> {
  const body = await getJson<{
    success: boolean
    message?: string
    data?: Summary
  }>('/expense/api/expense.php?action=summary')
  if (!body.success || !body.data) throw new Error(body.message || 'Could not load the expense summary.')
  return body.data
}

const allOf = (status: string) =>
  readExpenseList(
    {
      status,
      dateFrom: '',
      dateTo: '',
      orderBy: 'date_create',
      orderDir: 'desc',
    },
    0,
    -1,
  )
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// The module prints dates as dd/mm/yyyy.
const monthOf = (d: string) => {
  const [, m, y] = d.split('/')
  return y && m ? `${y}-${m}` : ''
}

export async function readOverview(): Promise<ExpenseDashboard> {
  const [s, list] = await Promise.all([readSummary(), allOf('')])
  const kpi = (label: string, value: string, sub: string, currency = ''): DashboardKpi => ({ label, value, currency, sub })
  // The last six months, newest last, summed from the reports' own totals.
  const now = new Date()
  const keys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    }
  })
  const sums = new Map<string, number>()
  for (const r of list.rows) sums.set(monthOf(r.dateCreate), (sums.get(monthOf(r.dateCreate)) ?? 0) + num(r.totalTtc))
  return {
    kpis: [
      kpi('Total Expenses', String(s.total), 'All time'),
      kpi('Pending Approval', String(s.pending_approval), 'Awaiting review'),
      kpi('Pending Payment', String(s.pending_payment), 'Approved, unpaid'),
      kpi('Paid', String(s.paid), 'Fully settled'),
      kpi('Total Amount', money2(s.total_amount), 'Fully settled'),
      kpi('Pending Amount', money2(s.pending_amount), 'To be paid'),
    ],
    months: keys.map((k) => k.label),
    trend: keys.map((k) => sums.get(k.key) ?? 0),
    typeLabels: [],
    typeData: [],
    currency: '',
    budgetYear: String(now.getFullYear()),
    budgets:
      s.budget_total > 0
        ? [
            {
              label: 'All budgets',
              pct: Math.round((s.budget_used / s.budget_total) * 100),
              used: money2(s.budget_used),
              budget: money2(s.budget_total),
            },
          ]
        : [],
    recent: list.rows.slice(0, 8).map((r) => ({
      id: String(r.id),
      ref: r.ref,
      user: r.userParty?.name ?? r.user,
      amount: r.totalTtc,
      status: r.status,
      date: r.dateCreate,
    })),
  }
}

const period = (r: ExpenseReportRow) => `${r.dateStart} – ${r.dateEnd}`

// The type the module prints for a report, told by the icon of its "Linked To" cell (person = Employee, truck = Vendor, building = Customer).
const typeOf = (r: ExpenseReportRow) =>
  !r.linkedParty ? 'Internal' : r.linkedParty.icon === 'user' ? 'Employee' : r.linkedParty.icon === 'truck' ? 'Vendor' : 'Customer'

// The approver is only in the report card's JSON; read the cards a few at a time (a failed card leaves the cell blank).
async function approversOf(ids: number[]): Promise<Map<number, { name: string; status: number }>> {
  const out = new Map<number, { name: string; status: number }>()
  for (let i = 0; i < ids.length; i += 6) {
    await Promise.all(
      ids.slice(i, i + 6).map(async (id) => {
        try {
          const c = await fapiGet<CardJson>('/expensereport/fapi/card.php', {
            id: String(id),
          })
          out.set(id, {
            name: c.approver?.fullname.replace(/\s+/g, ' ').trim() ?? '',
            status: c.status,
          })
        } catch {
          /* leave blank */
        }
      }),
    )
  }
  return out
}

// Every report, newest first, with the status chips of the page; a report still waiting shows "Awaiting: <approver>".
export async function readApprovals(): Promise<ApprovalRow[]> {
  const { rows } = await allOf('')
  const approvers = await approversOf(rows.map((r) => r.id))
  return rows.map((r, i) => {
    const who = approvers.get(r.id)?.name ?? ''
    return {
      n: i + 1,
      id: String(r.id),
      ref: r.ref,
      type: typeOf(r),
      employee: r.userParty?.name ?? r.user,
      approver: r.status === 'Submitted' && who ? `Awaiting: ${who}` : who,
      period: period(r),
      linkedTo: r.linkedParty,
      totalTtc: r.totalTtc,
      status: r.status,
    }
  })
}

// Approved and paid reports. The amount still owed comes from each report's card JSON (remaining_to_pay), which is what the Pay button
// offers; the advance and the amount already paid are not in any JSON, so those cells stay blank.
export async function readPayments(): Promise<{
  rows: PaymentRow[]
  note: string
}> {
  const [approved, paid] = await Promise.all([allOf('5'), allOf('6')])
  const list = [...approved.rows, ...paid.rows].sort((a, b) => b.id - a.id)
  const owed = new Map<number, number>()
  const open = list.filter((r) => !r.paid)
  for (let i = 0; i < open.length; i += 6) {
    await Promise.all(
      open.slice(i, i + 6).map(async (r) => {
        try {
          owed.set(
            r.id,
            (
              await fapiGet<CardJson>('/expensereport/fapi/card.php', {
                id: String(r.id),
              })
            ).remaining_to_pay,
          )
        } catch {
          /* no Pay button without the amount */
        }
      }),
    )
  }
  const rows = list.map((r, i): PaymentRow => {
    const left = owed.get(r.id)
    return {
      n: i + 1,
      id: String(r.id),
      ref: r.ref,
      type: 'Expense Payment',
      employee: r.userParty?.name ?? r.user,
      period: period(r),
      totalTtc: r.totalTtc,
      advance: '',
      netPayable: r.paid ? '0.00' : left !== undefined ? money2(left) : '',
      netTone: r.paid || !left ? 'settled' : 'owed',
      totalPaid: '',
      linked: '',
      status: r.status,
      paid: r.paid,
      action: !r.paid && left && left > 0 ? { kind: 'pay', amount: left, label: 'Pay' } : { kind: 'settled', label: r.paid ? 'Paid' : '' },
    }
  })
  return { rows, note: '' }
}

// ---- the New Expense form's dropdowns ---------------------------------------------------------------------------------------------------
// Read from the JSON the other modules serve (all checked on 5.10 and newecuenta, 13 Nov 2026), in the shapes the form's own selects had:
//   users                  expense/ajax/entity_search.php (30 at most; vendors are searched in the form instead of listed)
//   VAT rates + currency   product/fapi/form_options.php (a rate is posted as "16 (A)": rate, space, code in brackets)
//   products               product/fapi/list.php (paged, 500 a page)
//   projects               projet/fapi/projects.php (every status, like the old select)
// One thing the JSON cannot say: the old form listed only the users the signed-in user may create an expense for (2 on 5.10); the user
// picker lists every user, and the backend refuses a save for someone not allowed.
const opt = (value: string | number, label: string): FormOption => ({
  value: String(value),
  label,
  selected: false,
})

async function allPages<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= 20; page++) {
    const d = await fapiGet<{ items?: T[]; pagination?: { pages?: number } }>(path, { ...params, page })
    out.push(...(d.items ?? []))
    if (page >= (d.pagination?.pages ?? 1)) break
  }
  return out
}

export interface CreateFormSources {
  users: EntityOption[]
  vatRates: Array<{ rate: number; code: string }>
  currency: string
  products: Array<{ id: number; ref: string; label: string }>
  projects: Array<{
    id: number
    ref: string
    title: string
    status_label: string
  }>
}

// The old form's selects, built from the JSON sources: the same option values (a VAT rate is "16 (A)", a project 0 = none, a validator -1 = none).
export function buildCreateForm(src: CreateFormSources): ExpenseCreateForm {
  const seen = new Set<string>()
  const vatRates = src.vatRates
    .filter((v) => (seen.has(`${v.rate}|${v.code}`) ? false : (seen.add(`${v.rate}|${v.code}`), true)))
    .map((v) => opt(`${v.rate} (${v.code})`, `${v.rate}% (${v.code})`))
  return {
    authors: src.users.map((u) => opt(u.id, u.text)),
    validators: [opt('-1', 'Select a users'), ...src.users.map((u) => opt(u.id, u.text))],
    vatRates,
    projects: [opt('0', 'Select a project'), ...src.projects.map((p) => opt(p.id, `${p.ref}, ${p.title} - ${p.status_label}`))],
    vendors: [],
    products: [opt('0', 'Select Predefined Product/services'), ...src.products.map((p) => opt(p.id, `${p.ref} - ${p.label}`))],
    currency: src.currency,
  }
}

export async function readCreateForm(): Promise<ExpenseCreateForm> {
  const [users, form, products, projects] = await Promise.all([
    readEntities('user', ''),
    getProductFormOptions(),
    allPages<{ id: number; ref: string; label: string }>('/product/fapi/list.php', { limit: 500 }),
    allPages<{
      id: number
      ref: string
      title: string
      status: number
      status_label: string
    }>('/projet/fapi/projects.php', {
      action: 'list',
      filter: 'all',
      limit: 500,
    }),
  ])
  return buildCreateForm({
    users,
    vatRates: form.vat_rates,
    currency: String((form.defaults as { currency?: string } | undefined)?.currency ?? ''),
    products,
    projects,
  })
}

// ---- the expense card ------------------------------------------------------------------------------------------------------------------
// Built from JSON only (all read on 5.10, 13 Nov 2026, report 22 / 23 / 25 / 42):
//   expensereport/fapi/card.php?id=     status, totals, dates, author / validator / approver, notes, lines, allowed actions
//   expense/api/expense.php?action=get  the module's own type (customer / vendor / employee), the linked ids, the payment status
//   societe/fapi/get.php?id=            the linked customer's or vendor's name
//   expense/ajax/entity_search.php      the employee's name, and the "Target Employee" list of the clone dialog
// What the JSON does not carry: the people's photos, the receipt attached to each line, and the linked party's town / e-mail / phone.
interface CardPerson {
  id: number
  login: string
  fullname: string
}
interface CardJson {
  id: number
  ref: string
  status: number
  status_label: string
  paid: number
  remaining_to_pay: number
  totals: { total_ht: number; total_tva: number; total_ttc: number }
  dates: {
    date_debut: string
    date_fin: string
    date_create: string | null
    date_valid: string | null
    date_approve: string | null
    date_refuse: string | null
    date_cancel: string | null
  }
  author: CardPerson | null
  validator: CardPerson | null
  approver: CardPerson | null
  note_public: string | null
  note_private: string | null
  lines: Array<{
    id: number
    date: string
    type_fees_label: string
    comments: string
    qty: number
    value_unit: number
    vat_rate: number
    total_ttc: number
    product_ref: string | null
    product_label: string | null
    project_ref: string | null
    project_title: string | null
  }>
  allowed_actions: string[]
}
interface GetJson {
  expense_type: string
  payment_status: string
  fk_soc_vendor: number | string
  fk_soc_customer: number | string
  employeeid: number | string
}

const hm = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  const h = d.getUTCHours()
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(h % 12 || 12)}:${p(d.getUTCMinutes())} ${h < 12 ? 'AM' : 'PM'}`
}
const person = (p: CardPerson | null, sub: string): ExpenseCardPerson | null => (p ? { name: p.fullname.replace(/\s+/g, ' ').trim(), sub, photo: '' } : null)

// The buttons the card offers, in the page's own order. The JSON's allowed list is wider than the page: it also lists "classify paid" and
// "set unpaid", which the page never shows, and "back to draft" only counts while the report waits for approval.
const ACTION_ORDER: Array<[string, ExpenseCardAction]> = [
  ['send', 'sendEmail'],
  ['print', 'print'],
  ['modify', 'modify'],
  ['validate', 'validate'],
  ['set_draft', 'setDraft'],
  ['approve', 'approve'],
  ['deny', 'deny'],
  ['cancel', 'cancel'],
  ['pay', 'recordPayment'],
  ['clone', 'clone'],
  ['delete', 'delete'],
]
export function cardActions(status: number, allowed: string[]): ExpenseCardAction[] {
  const has = (k: string) => k === 'print' || (allowed.includes(k) && !(k === 'set_draft' && status !== 2))
  return ACTION_ORDER.filter(([k]) => has(k)).map(([, a]) => a)
}

// The module's own words for a report's status (the classic JSON calls 2 "Validated").
const STATUS_WORD: Record<number, string> = {
  0: 'Draft',
  2: 'Submitted',
  4: 'Canceled',
  5: 'Approved',
  6: 'Paid',
  99: 'Refused',
}

export interface CardSources {
  card: CardJson
  get: GetJson
  linkedName: string
  users: EntityOption[]
}

export function buildExpenseCard(src: CardSources): ExpenseCardPage {
  const { card, get, users } = src
  const kind = get.expense_type === 'vendor' ? 'vendor' : get.expense_type === 'employee' ? 'employee' : get.expense_type === 'customer' ? 'customer' : null
  const kindLabel = kind === 'vendor' ? 'Vendor' : kind === 'employee' ? 'Employee' : 'Customer'
  const linkedName = src.linkedName
  const dates = card.dates
  const status = STATUS_WORD[card.status] ?? card.status_label
  const fullname = (p: CardPerson | null) => p?.fullname.replace(/\s+/g, ' ').trim() ?? ''
  const approved = card.status === 5 || card.status === 6

  // Activity, as the page shows it: what has happened to the report in its present state (a report sent back to draft shows only its creation).
  const timeline: ExpenseCardPage['timeline'] = []
  const push = (label: string, iso: string | null, by: string, color: string) => timeline.push({ label, date: hm(iso), user: by, color })
  push('Expense created', dates.date_create, fullname(card.author), '#6c757d')
  if (card.status >= 2 && card.status !== 4 && card.status !== 99 && dates.date_valid)
    push('Submitted for approval', dates.date_valid, fullname(card.validator), '#0d6efd')
  if (approved && dates.date_approve) push('Approved', dates.date_approve, fullname(card.approver), '#198754')
  if (card.status === 99 && dates.date_refuse) push('Refused', dates.date_refuse, fullname(card.approver), '#dc3545')
  if (card.status === 4 && dates.date_cancel) push('Cancelled', dates.date_cancel, fullname(card.author), '#dc3545')
  if (card.status === 6) push('Marked as Paid', null, '', '#198754')

  const vat = (n: number) => (n ? money2(n) : '')
  const lines: ExpenseCardLine[] = card.lines.map((l) => {
    const label = linkedName && kind !== 'employee' && kind !== null ? linkedName : l.type_fees_label
    // "27/10/2026 • VAT 16.000% • Bank Charges": the VAT part only when there is VAT, the type only when the title is the company instead.
    const subtitle = [dmy(l.date), ...(l.vat_rate ? [`VAT ${l.vat_rate.toFixed(3)}%`] : []), ...(label !== l.type_fees_label ? [l.type_fees_label] : [])].join(
      ' • ',
    )
    return {
      id: String(l.id),
      label,
      subtitle,
      product: l.product_label ? `${l.product_ref ?? ''} ${l.product_label}`.trim() : '-',
      project: l.project_title ? `${l.project_ref ?? ''} ${l.project_title}`.trim() : '—',
      description: l.comments || '—',
      unit: money2(l.value_unit),
      qty: String(l.qty),
      total: money2(l.total_ttc),
      receipt: null,
    }
  })
  const notes = [
    ...(card.note_public?.trim() ? [{ label: 'Public Note', value: card.note_public.trim() }] : []),
    ...(card.note_private?.trim() ? [{ label: 'Private Note', value: card.note_private.trim() }] : []),
  ]
  const employeeId = kind === 'employee' && Number(get.employeeid) > 0 ? `ID #${get.employeeid}` : ''
  const linkedTo: ExpenseCardPage['linkedTo'] =
    kind && linkedName
      ? [
          {
            label: kindLabel,
            name: linkedName,
            photo: '',
            details: employeeId ? [employeeId] : [],
          },
        ]
      : get.expense_type === 'internal'
        ? [
            {
              label: 'Internal Expense',
              name: 'Internal Expense',
              photo: '',
              details: [],
            },
          ]
        : []
  return {
    ref: card.ref,
    status,
    author: fullname(card.author),
    period: `${dmy(dates.date_debut)} – ${dmy(dates.date_fin)}`,
    linked: kind && linkedName ? [{ kind, name: linkedName }] : [],
    totals: {
      ht: money2(card.totals.total_ht),
      vat: money2(card.totals.total_tva),
      ttc: money2(card.totals.total_ttc),
    },
    lines,
    subtotal: money2(card.totals.total_ht),
    tax: vat(card.totals.total_tva),
    total: money2(card.totals.total_ttc),
    actions: cardActions(card.status, card.allowed_actions),
    timeline,
    createdBy: person(card.author, `ID #${card.author?.id ?? ''}`),
    linkedTo,
    dates: [
      { label: 'Start', value: dmy(dates.date_debut) },
      { label: 'End', value: dmy(dates.date_fin) },
      { label: 'Created', value: dmy(dates.date_create) },
      { label: 'Submitted', value: dmy(dates.date_valid) },
      { label: 'Approved', value: approved ? dmy(dates.date_approve) : '' },
    ].filter((d) => d.value),
    validator: person(card.validator, card.validator?.login ?? ''),
    approvedBy: approved && dates.date_approve ? person(card.approver, hm(dates.date_approve)) : null,
    payment: {
      status,
      paid: card.status === 6 ? 'Paid' : 'Unpaid',
      ht: money2(card.totals.total_ht),
      vat: vat(card.totals.total_tva),
      ttc: money2(card.totals.total_ttc),
    },
    notes,
    // The JSON's "remaining to pay" still says 299.00 for a report that is Paid; the page prints 0.00 there.
    netPayable: money2(card.status === 6 ? 0 : card.remaining_to_pay),
    cloneUsers: users.map((u) => ({
      value: String(u.id),
      label: u.text,
      selected: false,
    })),
  }
}

export async function readExpenseCard(id: string): Promise<ExpenseCardPage> {
  const [card, got, users] = await Promise.all([
    fapiGet<CardJson>('/expensereport/fapi/card.php', { id }),
    getJson<{ success: boolean; message?: string; data?: GetJson }>(`/expense/api/expense.php?${new URLSearchParams({ action: 'get', id })}`),
    readEntities('user', ''),
  ])
  if (!got.success || !got.data) throw new Error(got.message || 'This expense could not be found.')
  const g = got.data
  let linkedName = ''
  if (g.expense_type === 'employee') linkedName = users.find((u) => String(u.id) === String(g.employeeid))?.text.replace(/\s*\([^)]*\)\s*$/, '') ?? ''
  else {
    const socid = g.expense_type === 'vendor' ? g.fk_soc_vendor : g.fk_soc_customer
    if (socid && Number(socid) > 0)
      linkedName = (
        await fapiGet<{ name: string }>('/societe/fapi/get.php', {
          id: String(socid),
        })
      ).name
  }
  return buildExpenseCard({ card, get: g, linkedName, users })
}

// ---- the List screen's four summary tiles, from the whole report list ------------------------------------------------------------------
export interface StatBucket {
  count: number
  amount: number
}
export interface ExpenseListStats {
  total: StatBucket
  validated: StatBucket
  approved: StatBucket
  unapproved: StatBucket
  paid: StatBucket
  unpaid: StatBucket
  // Reports per status word (Draft, Submitted, Approved, Paid, Refused, Canceled), for the chips of the Approvals screen.
  byStatus: Record<string, number>
}

export function buildListStats(rows: ExpenseReportRow[]): ExpenseListStats {
  const bucket = (pred: (r: ExpenseReportRow) => boolean): StatBucket => {
    const hit = rows.filter(pred)
    return {
      count: hit.length,
      amount: hit.reduce((a, r) => a + num(r.totalTtc), 0),
    }
  }
  const byStatus: Record<string, number> = {}
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  return {
    total: bucket(() => true),
    // "Validated" on the legacy screen counts the reports waiting for approval.
    validated: bucket((r) => r.status === 'Submitted'),
    approved: bucket((r) => r.status === 'Approved'),
    unapproved: bucket((r) => r.status !== 'Approved' && r.status !== 'Paid'),
    paid: bucket((r) => r.paid),
    unpaid: bucket((r) => !r.paid),
    byStatus,
  }
}

export async function readListStats(): Promise<ExpenseListStats> {
  return buildListStats((await allOf('')).rows)
}

// ---- Reports and Analytics, built from the report list and the report cards --------------------------------------------------------------
// expense/reports.php and analytics.php have no JSON feed. Their figures are sums over the reports (checked on 5.10, 13 Nov 2026: By Employee
// 40 + 2 reports, 7,367.00 in all, 940.00 paid; By Expense Type 43 lines; Analytics Oct 3,717.00 / 29 and Nov 3,650.00 / 13), so they are summed
// here from the list (per report) and from each report's card lines (per expense type). The department and branch filters, and the
// "By Department" chart, need the employee's department, which no JSON carries.
export interface ReportsFilters {
  yearFrom: string
  monthFrom: string
  yearTo: string
  monthTo: string
  // Carried because the page's filter type has them; no JSON can filter on them (see above), so they are not shown.
  dept: string
  branch: string
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// dd/mm/yyyy -> { y, m } (1-12)
const ym = (d: string) => {
  const [, m, y] = d.split('/')
  return { y: Number(y), m: Number(m) }
}

async function linesByType(ids: number[]): Promise<Map<string, { lines: number; ttc: number }>> {
  const out = new Map<string, { lines: number; ttc: number }>()
  for (let i = 0; i < ids.length; i += 6) {
    await Promise.all(
      ids.slice(i, i + 6).map(async (id) => {
        const c = await fapiGet<CardJson>('/expensereport/fapi/card.php', { id: String(id) })
        for (const l of c.lines) {
          const t = out.get(l.type_fees_label) ?? { lines: 0, ttc: 0 }
          out.set(l.type_fees_label, { lines: t.lines + 1, ttc: t.ttc + l.total_ttc })
        }
      }),
    )
  }
  return out
}

export function buildReportsPage(rows: ExpenseReportRow[], f: ReportsFilters, types: Map<string, { lines: number; ttc: number }>): ReportsPage {
  const byEmployee = new Map<string, { count: number; ht: number; vat: number; ttc: number; paid: number }>()
  for (const r of rows) {
    const name = r.userParty?.name ?? r.user
    const e = byEmployee.get(name) ?? { count: 0, ht: 0, vat: 0, ttc: 0, paid: 0 }
    e.count += 1
    e.ht += num(r.totalHt)
    e.vat += num(r.totalTva)
    e.ttc += num(r.totalTtc)
    if (r.paid) e.paid += num(r.totalTtc)
    byEmployee.set(name, e)
  }
  return {
    filters: f,
    months: MONTH_NAMES.map((label, i) => opt(i + 1, label)),
    byEmployee: [...byEmployee.entries()]
      .sort((a, b) => b[1].ttc - a[1].ttc)
      .map(([employee, e]) => ({ employee, count: String(e.count), ht: money2(e.ht), vat: money2(e.vat), ttc: money2(e.ttc), paid: money2(e.paid) })),
    byType: [...types.entries()].sort((a, b) => b[1].ttc - a[1].ttc).map(([type, t]) => ({ type, lines: String(t.lines), ttc: money2(t.ttc) })),
  }
}

export async function readReportsPage(filters: ReportsFilters | null): Promise<ReportsPage> {
  const year = String(new Date().getFullYear())
  const f = filters ?? { yearFrom: year, monthFrom: '1', yearTo: year, monthTo: '12', dept: '', branch: '' }
  const from = Number(f.yearFrom) * 12 + Number(f.monthFrom)
  const to = Number(f.yearTo) * 12 + Number(f.monthTo)
  const { rows } = await allOf('')
  const inRange = rows.filter((r) => {
    const { y, m } = ym(r.dateStart)
    return y * 12 + m >= from && y * 12 + m <= to
  })
  return buildReportsPage(inRange, f, await linesByType(inRange.map((r) => r.id)))
}

export function buildAnalytics(rows: ExpenseReportRow[], year: string, currency: string, types: Map<string, { lines: number; ttc: number }>): AnalyticsPage {
  const amounts = Array<number>(12).fill(0)
  const counts = Array<number>(12).fill(0)
  const emp = new Map<string, number>()
  for (const r of rows) {
    const { y, m } = ym(r.dateStart)
    if (String(y) !== year) continue
    amounts[m - 1] += num(r.totalTtc)
    counts[m - 1] += 1
    const name = r.userParty?.name ?? r.user
    emp.set(name, (emp.get(name) ?? 0) + num(r.totalTtc))
  }
  const top = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, amount]) => ({ label, amount }))
  return {
    year,
    currency,
    months: MONTHS,
    amounts,
    counts,
    employees: top(emp),
    types: top(new Map([...types.entries()].map(([k, v]) => [k, v.ttc]))),
    departments: [],
  }
}

export async function readAnalytics(year: string | null): Promise<AnalyticsPage> {
  const y = year ?? String(new Date().getFullYear())
  const { rows } = await allOf('')
  const inYear = rows.filter((r) => String(ym(r.dateStart).y) === y)
  const [types, form] = await Promise.all([
    linesByType(inYear.map((r) => r.id)),
    fapiGet<{ defaults?: { currency?: string } }>('/product/fapi/form_options.php'),
  ])
  return buildAnalytics(rows, y, String(form.defaults?.currency ?? ''), types)
}
