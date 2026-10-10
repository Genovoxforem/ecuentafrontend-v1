// Client-side pagination for every table that does not already page itself. Rows beyond the current page
// are hidden and a standard footer (page size, "Showing x to y of n", first/prev/numbers/next/last) is
// added under the table. Tables that already show a "Showing … of … entries" footer, nested tables and
// tables marked data-no-autopage are left alone.
const PAGE_SIZES = [10, 25, 50, 100]
const SHOWING = /Showing\s+\d[\d,]*\s+to\s+\d|\bof\s+\d[\d,]*\s+(entries|movements|products|items)|Page\s+\d+\s+of\s+\d+/i

interface PagerState {
  page: number
  size: number
  bar: HTMLDivElement
  count: number
}
const states = new WeakMap<HTMLTableElement, PagerState>()

function dataRows(table: HTMLTableElement): HTMLTableRowElement[] {
  const body = table.tBodies[0]
  if (!body) return []
  return Array.from(body.rows).filter((r) => !(r.cells.length === 1 && r.cells[0].colSpan > 1 && !r.cells[0].querySelector('table')))
}

function alreadyPaged(table: HTMLTableElement): boolean {
  let el: HTMLElement | null = table.parentElement
  for (let i = 0; i < 5 && el && el.id !== 'route-page-content'; i += 1, el = el.parentElement) {
    if (el.querySelector('.blue-density-pagination')) return true
    for (const child of Array.from(el.children)) {
      if (child.contains(table) || child.classList.contains('auto-pager')) continue
      if (child.textContent && child.textContent.length < 400 && SHOWING.test(child.textContent)) return true
    }
  }
  return false
}

function pageList(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(total - 1, page + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i += 1) out.push(i)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
}

function render(table: HTMLTableElement, state: PagerState) {
  const rows = dataRows(table)
  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / state.size))
  state.page = Math.min(state.page, pages)
  state.count = total
  const from = (state.page - 1) * state.size
  rows.forEach((row, i) => {
    row.style.display = i >= from && i < from + state.size ? '' : 'none'
  })

  const bar = state.bar
  bar.textContent = ''
  const left = document.createElement('div')
  left.className = 'auto-pager__left'
  const select = document.createElement('select')
  select.className = 'auto-pager__select'
  select.title = 'Rows per page'
  PAGE_SIZES.forEach((n) => {
    const o = document.createElement('option')
    o.value = String(n)
    o.textContent = String(n)
    o.selected = n === state.size
    select.appendChild(o)
  })
  select.addEventListener('change', () => {
    state.size = Number(select.value)
    state.page = 1
    render(table, state)
  })
  const info = document.createElement('span')
  info.textContent = total === 0 ? 'Showing 0 entries' : `Showing ${from + 1} to ${Math.min(from + state.size, total)} of ${total.toLocaleString()} entries`
  left.append(select, info)

  const right = document.createElement('div')
  right.className = 'auto-pager__right'
  const btn = (label: string, target: number, disabled: boolean, active = false) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    b.disabled = disabled
    b.className = `auto-pager__btn${active ? ' is-active' : ''}`
    b.addEventListener('click', () => {
      state.page = target
      render(table, state)
    })
    return b
  }
  right.append(btn('«', 1, state.page <= 1), btn('‹', state.page - 1, state.page <= 1))
  pageList(state.page, pages).forEach((p) => {
    if (p === '…') {
      const s = document.createElement('span')
      s.className = 'auto-pager__gap'
      s.textContent = '…'
      right.appendChild(s)
    } else right.appendChild(btn(String(p), p, false, p === state.page))
  })
  right.append(btn('›', state.page + 1, state.page >= pages), btn('»', pages, state.page >= pages))
  bar.append(left, right)
}

function attach(table: HTMLTableElement) {
  if (table.dataset.noAutopage !== undefined || table.closest('[data-no-autopage]') || table.closest('table table, td table, th table')) return
  if (!table.tHead || table.tBodies.length === 0) return
  const existing = states.get(table)
  if (existing) {
    if (existing.bar.isConnected && existing.count === dataRows(table).length) return
    if (existing.bar.isConnected) {
      render(table, existing)
      return
    }
  }
  if (dataRows(table).length === 0) return
  if (!existing && alreadyPaged(table)) return
  const host = table.parentElement
  if (!host) return
  const bar = existing?.bar ?? document.createElement('div')
  bar.className = 'auto-pager'
  const state: PagerState = existing ?? { page: 1, size: 10, bar, count: 0 }
  states.set(table, state)
  host.insertAdjacentElement('afterend', bar)
  render(table, state)
}

export function installAutoPagination(root: HTMLElement): () => void {
  let frame = 0
  const run = () => {
    frame = 0
    root.querySelectorAll('table').forEach((t) => attach(t as HTMLTableElement))
  }
  const schedule = (records: MutationRecord[]) => {
    if (records.every((r) => (r.target as HTMLElement).closest?.('.auto-pager'))) return
    if (!frame) frame = requestAnimationFrame(run)
  }
  const observer = new MutationObserver(schedule)
  observer.observe(root, { childList: true, subtree: true })
  run()
  return () => {
    observer.disconnect()
    if (frame) cancelAnimationFrame(frame)
    root.querySelectorAll('.auto-pager').forEach((n) => n.remove())
  }
}
