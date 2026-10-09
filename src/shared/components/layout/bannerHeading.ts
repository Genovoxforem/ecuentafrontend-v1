// The blue theme's page banner already shows the page title (and the list pages'
// "New …" buttons), but most pages also draw their own title row above their
// content: an <h2> with an icon, often with a "+" button on its right. These
// helpers find that row so the banner can absorb it. Only the DOM is touched by
// toggling a class, never the React tree, so pages keep working untouched.

export const HIDDEN_CLASS = 'blue-duplicate-page-title'

// Marks a header block that is drawn as a continuation of the page banner.
export const MERGED_CLASS = 'blue-banner-continues'

// Marks one of a page's headline-number cards, which are drawn compactly.
export const STAT_CLASS = 'blue-stat-card'

// A heading this close to the top of the page content is the page's own title;
// further down it is the title of a card or section and stays.
const TOP_LIMIT_PX = 80
const MAX_ROW_HEIGHT_PX = 96
const MAX_HOISTED_ACTIONS = 3
const GREETING = /^good (morning|afternoon|evening)\b/i
const NEEDS_THE_ORIGINAL = 'input, select, textarea, [aria-haspopup], [aria-expanded], [role="combobox"]'

export interface TitleRow {
  heading: HTMLElement
  // What to hide so the title disappears: the heading, or the wrapper holding only it.
  titleBlock: HTMLElement
  text: string
  // The flex row holding the title and its buttons, when there is one.
  row: HTMLElement | null
  // Buttons/links of that row that can be re-drawn in the banner (the original
  // stays in the page, hidden, and receives the click); null when the row holds
  // anything else (a search box, a dropdown, a count, ...) that must stay put.
  actions: HTMLElement[] | null
}

function isShown(el: HTMLElement, content: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== content; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
  }
  return true
}

const textOf = (el: HTMLElement) => (el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim()

function isFlexRow(el: HTMLElement): boolean {
  const style = getComputedStyle(el)
  return style.display.includes('flex') && style.flexDirection.startsWith('row') && el.children.length > 1
}

function interactiveIn(el: HTMLElement): HTMLElement[] {
  return el.matches('button, a[href]') ? [el] : [...el.querySelectorAll<HTMLElement>('button, a[href]')]
}

function hoistableActions(row: HTMLElement, titleChild: HTMLElement, content: HTMLElement): HTMLElement[] | null {
  if (row.querySelector(NEEDS_THE_ORIGINAL)) return null
  const actions: HTMLElement[] = []
  for (const child of Array.from(row.children) as HTMLElement[]) {
    if (child === titleChild) continue
    if (!isShown(child, content)) continue
    const own = interactiveIn(child)
    // Anything in the row that is not a button/link (a count, a label) keeps the row.
    if (own.length === 0 || textOf(child) !== own.map(textOf).filter(Boolean).join(' ')) return null
    actions.push(...own)
  }
  return actions.length > 0 && actions.length <= MAX_HOISTED_ACTIONS ? actions : null
}

export function findTitleRow(content: HTMLElement): TitleRow | null {
  const heading = [...content.querySelectorAll<HTMLElement>('h1, h2, h3')].find((h) => isShown(h, content))
  if (!heading || heading.closest('table, dialog, [role="dialog"]')) return null
  const text = textOf(heading)
  if (!text || GREETING.test(text)) return null
  const paddingTop = parseFloat(getComputedStyle(content).paddingTop) || 0
  const offset = heading.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop - paddingTop
  if (offset > TOP_LIMIT_PX) return null

  // Climb to the flex row that holds the title next to its buttons.
  let titleChild: HTMLElement = heading
  for (let level = 0; level < 3; level += 1) {
    const parent = titleChild.parentElement
    if (!parent || parent === content) break
    const height = parent.getBoundingClientRect().height
    if (height > MAX_ROW_HEIGHT_PX) break
    if (isFlexRow(parent)) {
      const titleOnly = textOf(titleChild) === text
      return { heading, titleBlock: titleOnly ? titleChild : heading, text, row: parent, actions: titleOnly ? hoistableActions(parent, titleChild, content) : null }
    }
    titleChild = parent
  }
  return { heading, titleBlock: heading, text, row: null, actions: null }
}

// Hiding the last visible child of a wrapper would leave an empty box (and the
// spacing around it), so hide the wrapper instead.
export function collapsible(el: HTMLElement, content: HTMLElement): HTMLElement {
  let node = el
  while (node.parentElement && node.parentElement !== content) {
    const parent = node.parentElement
    // A decorative icon beside the text is part of the same label, so it does
    // not keep the wrapper alive once the text itself is gone.
    const othersShown = Array.from(parent.children).some((c) => {
      const sibling = c as HTMLElement
      if (sibling === node || !isShown(sibling, content)) return false
      return textOf(sibling) !== '' || sibling.matches('button, a[href], input, select, textarea')
    })
    if (othersShown) break
    node = parent
  }
  return node
}


// The blocks a page draws at its very top before its content — a bar of
// back/close links, a record header with its tabs, a toolbar. They belong to the
// page banner visually, so they are found here and drawn as part of it.
const MAX_HEADER_HEIGHT_PX = 460

export function findHeaderBlocks(content: HTMLElement): HTMLElement[] {
  // A page is wrapped in one or more full-height layout divs before its own
  // header and body appear as siblings; descend past those.
  let host = content
  for (let depth = 0; depth < 3; depth += 1) {
    const only = host.children.length === 1 ? (host.firstElementChild as HTMLElement | null) : null
    if (!only || only.children.length === 0) break
    host = only
  }
  if (host.children.length < 2) return []
  const top = content.getBoundingClientRect().top
  const blocks: HTMLElement[] = []

  for (const child of Array.from(host.children) as HTMLElement[]) {
    const style = getComputedStyle(child)
    const box = child.getBoundingClientRect()
    if (style.display === 'none' || box.height === 0) continue
    // Everything below the first non-header block is the page's content.
    const isHeaderLike = style.position === 'sticky' || style.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(style.borderBottomWidth) > 0
    const isScrollBody = /overflow-y-auto|flex-1/.test(child.className) && box.height > MAX_HEADER_HEIGHT_PX
    if (!isHeaderLike || isScrollBody || box.height > MAX_HEADER_HEIGHT_PX) break
    // A block that starts well below the top is content, not a header.
    if (box.top - top > MAX_HEADER_HEIGHT_PX) break
    blocks.push(child)
  }
  return blocks
}

// The small cards a page puts in a row to show its headline numbers. Every
// module draws them a little differently (icon above the number, icon beside
// it, with or without a caption), so they are recognised by shape rather than
// by a class: a row of sibling cards, each short, each holding only a few words
// and no controls of its own.
const STAT_MIN_HEIGHT_PX = 56
const STAT_MAX_HEIGHT_PX = 160
const STAT_MAX_TEXT = 90

export function findStatCards(content: HTMLElement): HTMLElement[] {
  const cards: HTMLElement[] = []
  const rows = new Set<HTMLElement>()

  for (const candidate of Array.from(content.querySelectorAll<HTMLElement>('.app-card, [class*="rounded-"][class*="border"]'))) {
    const parent = candidate.parentElement
    if (!parent || rows.has(parent) || parent.closest('[data-no-stat-shrink]')) continue
    const style = getComputedStyle(parent)
    // A row of them: a grid, or a flex row of equal-looking tiles.
    if (!style.display.includes('grid') && !(style.display.includes('flex') && style.flexDirection.startsWith('row'))) continue

    const siblings = (Array.from(parent.children) as HTMLElement[]).filter((child) => {
      const box = child.getBoundingClientRect()
      if (box.height < STAT_MIN_HEIGHT_PX || box.height > STAT_MAX_HEIGHT_PX) return false
      if (child.querySelector('table, input, select, textarea, svg + svg')) return false
      return textOf(child).length <= STAT_MAX_TEXT
    })
    if (siblings.length < 2) continue
    rows.add(parent)
    cards.push(...siblings)
  }
  return cards
}

// A merged header block that holds nothing but its own buttons: those buttons
// belong on the banner's own row rather than on a row of their own below it.
export function onlyActions(block: HTMLElement): HTMLElement[] | null {
  if (block.querySelector('input, select, textarea, table, [role="tablist"], [aria-selected]')) return null
  if (block.getBoundingClientRect().height > MAX_ROW_HEIGHT_PX) return null
  const actions = Array.from(block.querySelectorAll<HTMLElement>('button, a[href]')).filter((el) => isShown(el, block))
  if (actions.length === 0 || actions.length > MAX_HOISTED_ACTIONS) return null
  const spoken = actions.map(textOf).filter(Boolean).join(' ')
  return textOf(block) === spoken ? actions : null
}