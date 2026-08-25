// Parses societe/new_card.php's own list-view HTML (llx_custom_group) — no
// REST endpoint exists for Customer Groups (confirmed 404 live on
// /api/customers/groups/ and every plausible path variant, plus
// /api/categories/), but this legacy page itself is real, session-cookie
// authenticated, and backs actual persisted rows: verified live by POSTing
// to new_card_ajax.php?action=add (real INSERT, returned a real
// cust_group_id) and then re-fetching this exact list page and finding the
// new row rendered in its table. Column layout below was read directly out
// of new_card.php's own PHP source (its `<table id="example">` loop, the
// `$group_data` while-loop around line 355-380), not guessed from a sample.

export interface CustomerGroupListRow {
  id: number
  label: string
  discount: number
  discountType: number
  discountMethod: number
  description: string
}

function cellText(cell: Element | undefined): string {
  return (cell?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// The actions cell holds an Edit link (new_card_products.php?...&id=X) and a
// Delete link (new_card.php?action=delete&id=X) — both carry the real
// llx_custom_group.rowid (confirmed live: differs from the S.No index shown
// in column 0). The Delete link is used since it's present on every row.
function rowIdFromActions(cell: Element | undefined): number | null {
  const link = cell?.querySelector('a[href*="action=delete"]')
  const match = link?.getAttribute('href')?.match(/[?&]id=(\d+)/)
  return match ? Number(match[1]) : null
}

// The method/discount cell only ever holds the pre-formatted text new_card.php
// itself builds server-side (customer_method==1 -> "Percentage -{discount}%",
// else -> "Product Price") — there's no separate raw-value column, so the
// codes are read back out of that exact text.
function parseMethodAndDiscount(text: string): { discountMethod: number; discount: number } {
  const match = /^Percentage\s*-(-?\d+(?:\.\d+)?)%$/.exec(text)
  if (match) return { discountMethod: 1, discount: Number(match[1]) }
  // Product Price rows: the real discount/discount_type values aren't shown
  // anywhere on this page (new_card.php's own display logic hides them for
  // customer_method==2), so they can't be recovered here — same as the
  // legacy page's own edit form, which only surfaces discount fields for
  // Percentage groups.
  return { discountMethod: 2, discount: 0 }
}

// discount_type is only meaningful when customer_method==1 (see new_card.php
// ~line 369-375); Product Price rows always render "N/A" regardless of the
// stored value, so there's nothing real to parse back for those.
function parseDiscountType(text: string): number {
  if (text === 'Increase') return 1
  if (text === 'Decrease') return 0
  return 0
}

export function parseCustomerGroupListDocument(doc: Document): CustomerGroupListRow[] {
  const rows = Array.from(doc.querySelectorAll('table#example tbody tr'))
  const result: CustomerGroupListRow[] = []
  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    const id = rowIdFromActions(cells[5])
    const label = cellText(cells[1])
    if (!id || !label) continue
    const { discountMethod, discount } = parseMethodAndDiscount(cellText(cells[2]))
    result.push({
      id,
      label,
      discount,
      discountType: parseDiscountType(cellText(cells[3])),
      discountMethod,
      description: cellText(cells[4]),
    })
  }
  return result
}

export function looksLikeGroupListLoginPage(doc: Document): boolean {
  return !doc.querySelector('table#example') && !!doc.querySelector('input[name="password"]')
}
