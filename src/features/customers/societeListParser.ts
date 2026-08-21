// Parses rows from societe/api/list.php (the Societe SPA's DataTables list
// endpoint) client-side — every cell is server-built HTML (getNomUrl(),
// getLibStatut(), hand-built <div>s), not a clean value. The exact structure
// per column below was read directly out of the real list.php PHP source
// (societe/api/list.php on the active backend), not guessed from a sample
// row — if that file's markup changes, these will need re-verifying the
// same way. Same discipline/shape as generalLedger/ledgerHtmlParser.ts.

export interface RawSocieteListRow {
  cust_name: string
  currency_country: string
  outstanding_balance: string
  tpin: string
  salesprepresentative: string
  email_phone: string
  cust_type: string
  tracking: string
  date: string
  status: string
}

export interface SocieteListRow {
  socid: number | null
  name: string
  country: string
  currency: string
  outstandingBalance: number
  tpin: string
  salesRep: string
  email: string
  phone: string
  isCustomer: boolean
  isProspect: boolean
  trackingId: string
  creatorName: string
  creationDateIso: string
  statusLabel: 'Open' | 'Closed'
}

function parseFragment(html: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  return wrapper
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(raw: string): number {
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

// cust_name: <div><a href=".../societe/card.php?socid=ID...">[optional
// avatar <div class="avatar-circle">INITIALS</div>]NAME</a></div> — NAME is
// the <a>'s own text nodes; the avatar div's text must be excluded or it
// gets prepended to the name (e.g. "AAaa" instead of "aa").
function parseCustName(html: string): { socid: number | null; name: string } {
  const root = parseFragment(html)
  const anchor = root.querySelector('a[href*="socid="]')
  if (!anchor) return { socid: null, name: text(root) }

  const socidMatch = anchor.getAttribute('href')?.match(/socid=(\d+)/)
  const socid = socidMatch ? Number(socidMatch[1]) : null

  const name = Array.from(anchor.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim()

  return { socid, name: name || text(anchor) }
}

// currency_country: <div><span>COUNTRY</span><small>Currency: CODE</small></div>
function parseCurrencyCountry(html: string): { country: string; currency: string } {
  const root = parseFragment(html)
  const country = text(root.querySelector('span'))
  const currencyText = text(root.querySelector('small'))
  const currency = currencyText.replace(/^Currency:\s*/i, '').trim()
  return { country, currency }
}

// email_phone: <div> with up to two <div> rows (fa-envelope / fa-phone
// icon + text), or a single placeholder <span>-</span> when both are empty.
function parseEmailPhone(html: string): { email: string; phone: string } {
  const root = parseFragment(html)
  let email = ''
  let phone = ''
  root.querySelectorAll('div > div').forEach((row) => {
    if (row.querySelector('.fa-envelope')) email = text(row)
    else if (row.querySelector('.fa-phone')) phone = text(row)
  })
  return { email, phone }
}

// cust_type: one or more <a title="Prospect|Customer|Supplier"> tags.
function parseCustType(html: string): { isCustomer: boolean; isProspect: boolean } {
  return {
    isCustomer: html.includes('title="Customer"'),
    isProspect: html.includes('title="Prospect"'),
  }
}

const DATE_RE = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i

// date: <div><span>[creator getNomUrl(...) or "-"]</span>
//   <small>On : MM/DD/YYYY hh:mm AM|PM</small></div>
function parseDate(html: string): { creatorName: string; creationDateIso: string } {
  const root = parseFragment(html)
  const creatorName = text(root.querySelector('span'))
  const small = text(root.querySelector('small')).replace(/^On\s*:\s*/i, '')

  const match = DATE_RE.exec(small)
  if (!match) return { creatorName, creationDateIso: '' }

  const [, month, day, year, hourRaw, minute, ampm] = match
  let hour = Number(hourRaw) % 12
  if (ampm.toUpperCase() === 'PM') hour += 12

  const date = new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute))
  return { creatorName, creationDateIso: date.toISOString() }
}

// status: getLibStatut(5) -> <span title="Open|Closed">Open|Closed</span>
function parseStatus(html: string): 'Open' | 'Closed' {
  return text(parseFragment(html)) === 'Open' ? 'Open' : 'Closed'
}

export function parseSocieteListRow(raw: RawSocieteListRow): SocieteListRow {
  const { socid, name } = parseCustName(raw.cust_name)
  const { country, currency } = parseCurrencyCountry(raw.currency_country)
  const { email, phone } = parseEmailPhone(raw.email_phone)
  const { isCustomer, isProspect } = parseCustType(raw.cust_type)
  const { creatorName, creationDateIso } = parseDate(raw.date)

  return {
    socid,
    name,
    country,
    currency,
    outstandingBalance: parseAmount(raw.outstanding_balance),
    tpin: raw.tpin?.trim() ?? '',
    salesRep: text(parseFragment(raw.salesprepresentative ?? '')),
    email,
    phone,
    isCustomer,
    isProspect,
    trackingId: raw.tracking?.trim() ?? '',
    creatorName,
    creationDateIso,
    statusLabel: parseStatus(raw.status),
  }
}
