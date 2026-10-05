// Shared parser for the real "day-pivot" attendance report shape used by
// three real backend pages — payroll/overtime_monthly.php, special_shift_report.php
// and holiday_shift_report.php — confirmed live to share one identical real
// template (even the page title bug: all three print the wrong subhead text
// "OVERALL ATTENDANCE REPORT", a genuine copy-paste leftover in the real
// PHP, reproduced here verbatim rather than silently corrected). Real shape,
// confirmed by reading each page's own PHP and by live GET requests against
// 172.16.5.55: for each Entity (real llx_entity row, shown as its own <h5>),
// one real <table id="example2"> per user Group under that entity, each
// with one column per calendar day of the selected month (so column count
// varies 28–31) plus a trailing Total column, and one real <tr> per
// employee in that group. All three pages are plain GET-able classic pages
// (confirmed: "For The Month of X" echoes back exactly what was sent), but
// one real per-page inconsistency: overtime_monthly.php and
// holiday_shift_report.php both read the month from a `month` param,
// special_shift_report.php instead reads `monthPic` — see each page's own
// hook in payrollLists.queries.ts for which it sends.

export interface ShiftPivotEntityOption {
  value: string
  label: string
}

// #entity_li is server-rendered directly into each of these 3 pages (no
// separate endpoint needed) — "Select Entity" (blank), "All Entity" (only
// when the logged-in user's own entity is the master entity, conf->entity
// == 1), then one real option per llx_entity row.
export function parseShiftReportEntities(doc: Document): ShiftPivotEntityOption[] {
  const select = doc.querySelector('#entity_li')
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ value: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
    .filter((o) => o.value)
}

export interface ShiftPivotDayColumn {
  day: string
  weekday: string
}

export interface ShiftPivotEmployeeRow {
  employee: string
  cells: string[]
  total: string
}

export interface ShiftPivotGroup {
  entity: string
  group: string
  days: ShiftPivotDayColumn[]
  rows: ShiftPivotEmployeeRow[]
}

export interface ShiftPivotReportResult {
  subhead: string
  periodLabel: string
  groups: ShiftPivotGroup[]
}

export function parseShiftPivotReport(html: string): ShiftPivotReportResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const subhead = (doc.querySelector('#div_subhead1')?.textContent ?? '').trim()
  const periodText = (doc.querySelector('.sub_head')?.textContent ?? '').trim()
  const periodLabel = periodText.replace(/^For The Month of\s*/i, '').trim()

  const container = doc.querySelector('#exportToExcel')
  const groups: ShiftPivotGroup[] = []
  let currentEntity = ''

  Array.from(container?.children ?? []).forEach((el) => {
    if (el.tagName === 'H5') {
      currentEntity = (el.textContent ?? '').trim()
      return
    }
    if (el.tagName !== 'TABLE') return

    const headerCells = Array.from(el.querySelectorAll('thead th'))
    // First header is EMPLOYEE, last is Total — everything between is a day column.
    const days: ShiftPivotDayColumn[] = headerCells.slice(1, -1).map((th) => {
      const day = (th.childNodes[0]?.textContent ?? '').trim()
      const weekday = (th.querySelector('small')?.textContent ?? '').trim()
      return { day, weekday }
    })

    const tbody = el.querySelector('tbody')
    const groupName = (tbody?.querySelector('h5')?.textContent ?? '').trim()
    const rows: ShiftPivotEmployeeRow[] = Array.from(tbody?.querySelectorAll(':scope > tr') ?? []).map((tr) => {
      const tds = Array.from(tr.querySelectorAll(':scope > td'))
      return {
        employee: (tds[0]?.textContent ?? '').trim(),
        cells: tds.slice(1, -1).map((td) => (td.textContent ?? '').trim()),
        total: (tds[tds.length - 1]?.textContent ?? '').trim(),
      }
    })

    groups.push({ entity: currentEntity, group: groupName, days, rows })
  })

  return { subhead, periodLabel, groups }
}
