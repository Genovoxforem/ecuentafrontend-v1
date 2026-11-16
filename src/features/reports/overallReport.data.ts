import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import type { ReportTable } from '../../shared/legacyReportTableParser'
import { usDate } from './reportFormat'

// "Overall Report Dashboard" (classic custom/reports/overall_report.php, titled "Overall Analysis Report" in the Reports Center). The page is
// server-rendered: GET ?entity=<id>&warehouse=<id|0>&tab=<tab>&newdatepicker=MM/DD/YYYY-MM/DD/YYYY answers the whole page for one tab (read on newecuenta on
// 10 Nov 2026, 13 tabs, all answer 200). Every answer carries
//   .report-header        title + "Business Report · <period> · <warehouse>"
//   select[name=entity], select[name=warehouse]   the filter choices
//   .ec-report-stats-content (x6)   Total Sales, Purchases, Stock Value, Gross Profit, Net Profit, Cash Flow (value + currency)
//   a[href*="tab="]       the tab keys and labels (the first seven are always visible, the rest sit under "More...")
//   .card > .card-header h5 "<Tab> Report" and .card-body: captions (.nyi-sec / h6), tables, .alert notes, <p> notes, VAT stat boxes (.vat-item)
// There is no JSON endpoint behind it (the classic Export Excel / CSV are server downloads of the same page), so the page is read with the signed-in
// session, like the other classic-page reports.

export interface OverallKpi {
  label: string
  value: string
  currency: string
}

export type OverallBlock =
  | { kind: 'caption'; text: string }
  | { kind: 'table'; table: ReportTable }
  | { kind: 'note'; text: string }
  | { kind: 'stat'; text: string }

export interface OverallTab {
  key: string
  label: string
}

export interface OverallOption {
  value: string
  label: string
}

export interface OverallReport {
  title: string
  subtitle: string
  kpis: OverallKpi[]
  tabs: OverallTab[]
  entities: OverallOption[]
  warehouses: OverallOption[]
  selectedEntity: string
  selectedWarehouse: string
  paneTitle: string
  blocks: OverallBlock[]
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

function options(doc: Document, name: string): { options: OverallOption[]; selected: string } {
  const sel = doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  const opts = Array.from(sel?.options ?? []).map((o) => ({ value: o.value, label: clean(o.textContent) }))
  const chosen = Array.from(sel?.options ?? []).find((o) => o.selected)
  return { options: opts, selected: chosen?.value ?? opts[0]?.value ?? '' }
}

function tableOf(t: HTMLTableElement): ReportTable {
  const headRow = t.tHead?.rows[0] ?? t.rows[0]
  const headers = Array.from(headRow?.cells ?? []).map((c) => clean(c.textContent))
  const bodyRows = t.tBodies.length ? Array.from(t.tBodies).flatMap((b) => Array.from(b.rows)) : Array.from(t.rows).slice(t.tHead ? 0 : 1)
  const rows = bodyRows.filter((r) => r !== headRow).map((r) => Array.from(r.cells).map((c) => clean(c.textContent)))
  return { headers, rows }
}

// The tables, captions and notes of the tab's card, in the order the classic page prints them.
function blocksOf(root: Element): OverallBlock[] {
  const out: OverallBlock[] = []
  root.querySelectorAll('.nyi-sec, h6, table, .alert, p, .vat-item').forEach((el) => {
    if (el.closest('dialog') || el.closest('.export-buttons')) return
    if (el.tagName !== 'TABLE' && el.closest('table')) return
    if (el.tagName === 'TABLE') {
      if (el.parentElement?.closest('table')) return
      out.push({ kind: 'table', table: tableOf(el as HTMLTableElement) })
      return
    }
    if (el.matches('p, .alert') && el.querySelector('table')) return
    const text = clean(el.textContent)
    if (!text) return
    if (el.matches('.nyi-sec, h6')) out.push({ kind: 'caption', text })
    else if (el.matches('.vat-item')) out.push({ kind: 'stat', text })
    else out.push({ kind: 'note', text })
  })
  return out
}

export function parseOverallReport(doc: Document): OverallReport {
  // the six figures of the header; the page's currency converter uses the same markup further down (ZMW / USD / INR rates), so only the first six count
  const kpis = Array.from(doc.querySelectorAll('.ec-report-stats-content')).slice(0, 6).map((c) => {
    const cur = clean(c.querySelector('.ec-report-stats-value-currency')?.textContent)
    const valueEl = c.querySelector('.ec-report-stats-value')
    const value = clean(Array.from(valueEl?.childNodes ?? []).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '))
    return { label: clean(c.querySelector('.ec-report-stats-title')?.textContent), value, currency: cur }
  })
  const header = doc.querySelector('.report-header')
  const title = clean(header?.querySelector('.titre')?.textContent) || 'Overall Report Dashboard'
  const subtitle = clean(header?.querySelector('small')?.textContent)
  const seen = new Set<string>()
  const tabs: OverallTab[] = []
  doc.querySelectorAll('a[href*="tab="]').forEach((a) => {
    const href = a.getAttribute('href') ?? ''
    if (/export=/.test(href)) return
    const key = /[?&]tab=([a-z_]+)/.exec(href)?.[1]
    const label = clean(a.textContent)
    if (!key || !label || /^clear$/i.test(label) || seen.has(key)) return
    seen.add(key)
    tabs.push({ key, label })
  })
  const heading = Array.from(doc.querySelectorAll('h5')).find((h) => / Report$/.test(clean(h.textContent)) && !/^Overall/.test(clean(h.textContent)))
  const card = heading?.closest('.card') ?? null
  const entity = options(doc, 'entity')
  const warehouse = options(doc, 'warehouse')
  return {
    title,
    subtitle,
    kpis,
    tabs,
    entities: entity.options,
    warehouses: warehouse.options,
    selectedEntity: entity.selected,
    selectedWarehouse: warehouse.selected,
    paneTitle: clean(heading?.textContent),
    blocks: card ? blocksOf(card.querySelector('.card-body') ?? card) : [],
  }
}

export interface OverallFilters {
  entity: string
  warehouse: string
  tab: string
  from: string
  to: string
}

export async function loadOverallReport(f: OverallFilters): Promise<OverallReport> {
  const params = new URLSearchParams({ tab: f.tab, newdatepicker: `${usDate(f.from)}-${usDate(f.to)}` })
  if (f.entity) params.set('entity', f.entity)
  if (f.warehouse) params.set('warehouse', f.warehouse)
  return parseOverallReport(await fetchLegacyDocument('/custom/reports/overall_report.php', params))
}

export function useOverallReport(f: OverallFilters) {
  return useQuery({ queryKey: ['reports', 'overall', f], queryFn: () => loadOverallReport(f), placeholderData: keepPreviousData, staleTime: 60_000 })
}
