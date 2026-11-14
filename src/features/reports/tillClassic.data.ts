import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, legacyMissingContentError, parseLegacyJson } from '../../shared/legacyHtmlFetch'
import { isoFromUs, usDate } from './reportFormat'

// "Till Sales Report" and "Till Sessions Report" of the Reports Center (first two entries of "Turnover -Sale/Purchase Invoices" in the classic
// custom/reports/reportsindex.php). They have NO JSON list: takeposnew/till_sales_report.php and till_sessions_report.php are server-rendered
// GET forms and answer the login page to the API key alone (checked on newecuenta, 10 Nov 2026), so, like the Members pages, they are read from
// the classic page with the classic session. Markup seen live on 10 Nov 2026 (fixtures tests/fixtures/reports-till-*.html):
//   div.tsr-wrap > h2, [div.tsr-note], form.tsr-filter (div.fld: label + input / select), div.tsr-cards > div.tsr-card (.lbl .val .sub),
//   then table.tsr-table (optionally after an h4 heading: Products by Category & Table). In the Orders and Sessions tables the first column is
//   a "+" toggle, each row is tr.tsr-row (data-oid / data-sid) followed by a hidden tr.tsr-detail that the page fills from the same file:
//     ?action=orderdetail&order_id=N   -> {success, lines [{label, ref, qty, price, ttc, kot, cats, is_supp, is_comp, comps, mods}], payments [{date, label, amount, num, change, user}]}
//     ?action=sessiondetail&session_id=N -> {success, payments [{date, invoice, label, num, amount, change, user}]}   (shape of a row from the page's own script:
//                                            the three open sessions of newecuenta have no payment) or {success:false, error:"Session not in scope"}
// Every filter is a query parameter of the same page: daterange="MM/DD/YYYY - MM/DD/YYYY", terminals[], tillusers[], sessstatus, view, q, ordertype,
// category, product_search, itemkind, paytypes[], orderstatus. The CSV and PDF buttons of the classic form (files built by the page) are not built:
// the tables export from their own buttons.

export type TillKind = 'sales' | 'sessions'

export const TILL_PATH: Record<TillKind, string> = {
  sales: '/takeposnew/till_sales_report.php',
  sessions: '/takeposnew/till_sessions_report.php',
}

export interface TillOption {
  value: string
  label: string
}

export interface TillField {
  name: string
  label: string
  multiple: boolean
  // null = a text box
  options: TillOption[] | null
  value: string[]
}

export interface TillCard {
  label: string
  value: string
  lines: string[]
}

export interface TillRowEvents {
  created: string
  validated: string
  updated: string
}

export interface TillRow {
  cells: string[]
  // data-oid (an order) or data-sid (a session): the row can be opened.
  detailId: string | null
  events: TillRowEvents | null
}

export interface TillTable {
  heading: string
  headers: string[]
  rows: TillRow[]
  // The one-cell row of an empty table ("No till orders found for the selected period/filters.").
  emptyNote: string
}

export interface TillPage {
  note: string
  range: { start: string; end: string }
  fields: TillField[]
  cards: TillCard[]
  tables: TillTable[]
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

// "11/04/2026 - 11/10/2026" -> the two days as yyyy-mm-dd ('' for a part that is not a date)
export function parseRange(text: string): { start: string; end: string } {
  const [a = '', b = ''] = text.split(' - ').map((p) => p.trim())
  return { start: isoFromUs(a) === a ? '' : isoFromUs(a), end: isoFromUs(b) === b ? '' : isoFromUs(b) }
}

function readFields(form: Element): { fields: TillField[]; range: string } {
  const fields: TillField[] = []
  let range = ''
  for (const fld of Array.from(form.querySelectorAll('.fld'))) {
    const label = clean(fld.querySelector('label')?.textContent)
    const select = fld.querySelector('select')
    const input = fld.querySelector('input[type="text"], input:not([type])')
    if (select) {
      const options = Array.from(select.options, (o) => ({ value: o.value, label: clean(o.textContent) }))
      const value = select.multiple ? Array.from(select.options).filter((o) => o.selected).map((o) => o.value) : [select.value]
      fields.push({ name: select.name.replace(/\[\]$/, ''), label, multiple: select.multiple, options, value })
    } else if (input instanceof HTMLInputElement) {
      if (input.name === 'daterange') range = input.value
      else fields.push({ name: input.name, label, multiple: false, options: null, value: [input.value] })
    }
  }
  return { fields, range }
}

function readCards(wrap: Element): TillCard[] {
  return Array.from(wrap.querySelectorAll('.tsr-cards > .tsr-card')).map((card) => {
    const sub = card.querySelector('.sub')
    // "By Payment Type" prints one line per type, separated by <br>
    const lines = sub ? sub.innerHTML.split(/<br\s*\/?>/i).map((l) => clean(l.replace(/<[^>]+>/g, ''))).filter(Boolean) : []
    return { label: clean(card.querySelector('.lbl')?.textContent), value: clean(card.querySelector('.val')?.textContent), lines }
  })
}

function readTable(table: Element, heading: string): TillTable {
  const head = Array.from(table.querySelectorAll('thead th'), (th) => clean(th.textContent))
  const rows: TillRow[] = []
  let emptyNote = ''
  let toggled = false
  for (const tr of Array.from(table.querySelectorAll('tbody tr'))) {
    if (tr.classList.contains('tsr-detail')) continue
    const cells = Array.from(tr.children)
    if (cells.length === 1 && (cells[0] as HTMLTableCellElement).colSpan > 1) {
      emptyNote = clean(cells[0].textContent)
      continue
    }
    const hasToggle = cells[0]?.classList.contains('tsr-toggle') ?? false
    toggled = toggled || hasToggle
    const detail = tr.nextElementSibling?.classList.contains('tsr-detail') ? tr.nextElementSibling : null
    rows.push({
      cells: (hasToggle ? cells.slice(1) : cells).map((c) => clean(c.textContent)),
      detailId: tr.getAttribute('data-oid') ?? tr.getAttribute('data-sid'),
      events: detail?.hasAttribute('data-datec') ? { created: detail.getAttribute('data-datec') ?? '', validated: detail.getAttribute('data-datev') ?? '', updated: detail.getAttribute('data-tms') ?? '' } : null,
    })
  }
  return { heading, headers: toggled || head[0] === '' ? head.slice(1) : head, rows, emptyNote }
}

export function readTillPage(doc: Document): TillPage {
  const wrap = doc.querySelector('.tsr-wrap')
  if (!wrap) throw legacyMissingContentError(doc, 'The till report was not found on the page.')
  const form = wrap.querySelector('form.tsr-filter')
  const { fields, range } = form ? readFields(form) : { fields: [], range: '' }
  const tables: TillTable[] = []
  let heading = ''
  for (const child of Array.from(wrap.children)) {
    if (child.tagName === 'H4') heading = clean(child.textContent)
    else if (child.tagName === 'TABLE') {
      tables.push(readTable(child, heading))
      heading = ''
    }
  }
  return { note: clean(wrap.querySelector('.tsr-note')?.textContent), range: parseRange(range), fields, cards: readCards(wrap), tables }
}

// The query string of the page for the chosen filters; multi-selects repeat their name with [].
export function tillParams(values: Record<string, string[]>, range?: { start: string; end: string }): URLSearchParams {
  const p = new URLSearchParams()
  if (range?.start && range.end) p.set('daterange', `${usDate(range.start)} - ${usDate(range.end)}`)
  for (const [name, list] of Object.entries(values)) {
    const multi = list.length > 1 || name.endsWith('[]')
    for (const v of list) if (v !== '') p.append(multi ? `${name}[]` : name, v)
  }
  return p
}

export function useTillPage(kind: TillKind, query: string) {
  return useQuery({
    queryKey: ['reports', 'tillClassic', kind, query],
    queryFn: async () => readTillPage(await fetchLegacyDocument(TILL_PATH[kind], new URLSearchParams(query))),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export interface OrderDetail {
  lines: Array<{ label: string; ref: string; qty: number; price: number; ttc: number; kot: string | null; cats: string[]; is_supp: boolean; is_comp: boolean; comps: Array<{ qty: number; label: string; yw?: string }>; mods: Array<{ qty: number; label: string; ttc: number }> }>
  payments: Array<{ date: string; label: string; amount: number; num: string | null; change: number; user: string }>
}

export interface SessionDetail {
  payments: Array<{ date: string; invoice: string; label: string; num: string | null; amount: number; change: number; user: string }>
}

// The page's own JSON calls (action=orderdetail | sessiondetail), with the filters of the page as it is shown.
export async function loadTillDetail<T>(kind: TillKind, id: string, query: string): Promise<T> {
  const p = new URLSearchParams(query)
  p.set('action', kind === 'sales' ? 'orderdetail' : 'sessiondetail')
  p.set(kind === 'sales' ? 'order_id' : 'session_id', id)
  const res = await fetch(`${TILL_PATH[kind]}?${p.toString()}`, { credentials: 'same-origin' })
  const body = await parseLegacyJson<{ success: boolean; error?: string } & T>(res)
  if (!body.success) throw new Error(body.error || 'Failed to load the details.')
  return body
}
