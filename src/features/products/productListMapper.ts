import type { ProductListItem } from '../../api/products'
import type { RichProductRow } from './productRich'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// product/fapi/list.php prints dates as "09/21/2026 06:49 AM" (the backend's own
// display format). The list shows them the way the old report did ("21,Sep 2026")
// and sorts on the real timestamp, so both come from this one parse. An unreadable
// value gives '' and 0 — never an invented date.
export function parseListDate(value: string | null | undefined): { text: string; time: number } {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AP]M))?$/i.exec((value ?? '').trim())
  if (!m) return { text: '', time: 0 }
  const month = Number(m[1]) - 1
  const day = Number(m[2])
  const year = Number(m[3])
  if (month < 0 || month > 11) return { text: '', time: 0 }
  let hours = m[4] ? Number(m[4]) % 12 : 0
  if (m[6]?.toUpperCase() === 'PM') hours += 12
  return { text: `${day},${MONTHS[month]} ${year}`, time: new Date(year, month, day, hours, m[5] ? Number(m[5]) : 0).getTime() }
}

// One product/fapi/list.php row in the shape the All Products screens already
// render. The list has no per-product avatar colours or lot/serial status, so those
// stay empty and the screens show their usual "—".
export function richRowFromListItem(item: ProductListItem): RichProductRow {
  const created = parseListDate(item.date_creation)
  const shownPrice = item.price_base_type === 'TTC' ? item.price_ttc : item.price
  return {
    id: String(item.id),
    ref: item.ref,
    name: item.label,
    productUrl: `/product/card.php?id=${item.id}`,
    category: item.categories.map((c) => c.label).join(', '),
    price: Number.isFinite(Number(shownPrice)) ? Number(shownPrice).toFixed(2) : '',
    priceBaseType: item.price_base_type === 'TTC' ? 'TTC' : 'HT',
    stockDesired: Number(item.desired_stock) || 0,
    stockReserved: Number(item.total_reserved) || 0,
    stockPhysical: Number(item.stock) || 0,
    classification: item.zra?.classification || null,
    zraStatus: item.zra?.status ?? '',
    vatCode: item.default_vat_code ?? '',
    country: item.country?.label ?? '',
    createdDate: created.text,
    createdAt: created.time,
    lotStatus: item.lot_status ?? '',
    toBatch: item.tobatch ?? null,
    avatarBg: null,
    avatarColor: null,
  }
}
