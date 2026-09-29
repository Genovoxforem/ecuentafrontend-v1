// Parses fourn/facture/landedcostlist.php (List Landed Cost). Verified against the dev backend:
//   - `table#example` rows: date, invoice (link `?facid=N`), product, vendor (link `?socid=N`),
//     service/expense, amount, allocated amount, unallocated amount;
//   - the product cell is left out when the invoice has no product line, so the vendor cell is
//     found by its link rather than by position;
//   - the page itself is broken on the reachable backends: its (HTML-commented) unallocated cell
//     runs `$obj->landed_cost - $obj->allocated` on a null and PHP dies with "Fatal error:
//     Uncaught TypeError: Unsupported operand types: string - null" partway through the FIRST row,
//     which is why that row has 7 cells and no further row is printed. The error text lands in an
//     unclosed comment, so it is detected there;
//   - the product filter is `?submitt=1&product_id=N` (the select's `product_id`).

export interface LandedCostRow {
  key: string
  date: string
  invoiceRef: string
  invoiceId: string
  product: string
  vendor: string
  vendorId: string
  expense: string
  amount: number
  allocated: number
  unallocated: number
}

export interface LandedCostProduct {
  id: string
  label: string
}

export interface LandedCostListData {
  rows: LandedCostRow[]
  products: LandedCostProduct[]
  // The backend page stopped with a PHP error, so records after that point were never printed.
  incomplete: boolean
}

const clean = (value: string | null | undefined) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

// "1,234.50" -> 1234.5
const toNumber = (value: string | null | undefined) => {
  const n = Number(clean(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

// The vendor link holds an initials avatar before the name; only the name is wanted.
function vendorName(cell: Element): string {
  const copy = cell.cloneNode(true) as Element
  copy.querySelectorAll('.avatar-circle').forEach((n) => n.remove())
  return clean(copy.textContent)
}

export function parseLandedCostList(doc: Document): LandedCostListData {
  const table = doc.querySelector('table#example')
  if (!table) throw new Error('The landed cost list on this backend page was not recognised.')

  const rows: LandedCostRow[] = []
  table.querySelectorAll('tbody tr').forEach((tr, index) => {
    const cells = Array.from(tr.querySelectorAll(':scope > td'))
    if (cells.length < 6) return
    const vendorIndex = cells.findIndex((td) => td.querySelector('a[href*="socid="]'))
    // The product cell is missing, so everything after the invoice shifts left by one.
    const productMissing = vendorIndex === 2
    const at = (i: number) => cells[productMissing ? i - 1 : i]
    const amount = toNumber(at(5)?.textContent)
    const allocated = toNumber(at(6)?.textContent)
    const unallocatedCell = at(7)
    const invoiceLink = cells[1]?.querySelector('a[href*="facid="]')?.getAttribute('href') ?? ''
    const vendorLink = at(3)?.querySelector('a[href*="socid="]')?.getAttribute('href') ?? ''
    rows.push({
      key: `${index}`,
      date: clean(cells[0].textContent),
      invoiceRef: clean(cells[1]?.textContent),
      invoiceId: invoiceLink.match(/[?&]facid=(\d+)/)?.[1] ?? '',
      product: productMissing ? '' : clean(cells[2]?.textContent),
      vendor: at(3) ? vendorName(at(3)) : '',
      vendorId: vendorLink.match(/[?&]socid=(\d+)/)?.[1] ?? '',
      expense: clean(at(4)?.textContent),
      amount,
      allocated,
      // The page's own formula is landed cost - allocated; it is only missing when the page died.
      unallocated: unallocatedCell ? toNumber(unallocatedCell.textContent) : amount - allocated,
    })
  })

  const products = Array.from(doc.querySelectorAll('select[name="product_id"] option'))
    .map((o) => ({ id: (o.getAttribute('value') ?? '').trim(), label: clean(o.textContent) }))
    .filter((o) => o.id !== '')

  return { rows, products, incomplete: /Fatal error|Uncaught/.test(table.outerHTML) }
}
