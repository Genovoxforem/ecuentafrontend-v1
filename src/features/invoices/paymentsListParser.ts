// compta/paiement/list.php — the classic "List of payments" (Report Area).
// Confirmed live against 172.16.5.10: a server-rendered table with the columns
// Ref. payment / Date / Third-party / Type / Number / Bank entry / Account /
// Amount, listing every payment in a period. `newdatepicker` ("MM/dd/yyyy -
// MM/dd/yyyy") sets the period (the page defaults to the current month) and
// the page ignores limit/page — it returns the whole period in one response.
// The React payments pages used to call GET /api/payments/, which does not
// exist on the backend (404); this is the real source of the same data.

export interface PaymentRow {
  // The payment's own id isn't in the list (the ref link carries none); the
  // bank entry id is the closest stable id the row has.
  id: number
  ref: string
  paymentReference: string | null // "Number" column — the invoice(s) paid
  customerName: string | null
  socid: number | null
  paymentDate: string // yyyy-MM-dd
  paymentTypeLabel: string | null
  amount: number
  bankEntryId: number | null
  accountId: number | null
  accountName: string | null
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const param = (href: string | null | undefined, key: string): number | null => {
  const v = Number(new URLSearchParams((href ?? '').split('?')[1] ?? '').get(key))
  return Number.isFinite(v) && v > 0 ? v : null
}

// "09/24/2026" -> "2026-09-24"
function isoDate(us: string): string {
  const m = us.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}

export function parsePaymentsList(doc: Document): PaymentRow[] {
  const table = Array.from(doc.querySelectorAll('table')).find((t) => !t.querySelector('table') && /^Ref\.?\s*payment/i.test(text(t.querySelector('tr'))))
  const heads = Array.from(table?.querySelector('tr')?.children ?? []).map((c) => text(c).toLowerCase())
  const col = (re: RegExp) => heads.findIndex((h) => re.test(h))
  const i = { ref: col(/^ref/), date: col(/^date/), party: col(/^third/), type: col(/^type/), num: col(/^number/), entry: col(/^bank entry/), account: col(/^account/), amount: col(/^amount/) }

  const rows: PaymentRow[] = []
  for (const tr of Array.from(table?.querySelectorAll('tr.oddeven') ?? [])) {
    const c = Array.from(tr.children)
    if (c.length < heads.length || !text(c[i.ref])) continue
    const partyLink = c[i.party]?.querySelector('a')
    const entryLink = c[i.entry]?.querySelector('a')
    const accountLink = c[i.account]?.querySelector('a')
    const bankEntryId = param(entryLink?.getAttribute('href'), 'rowid')
    rows.push({
      id: bankEntryId ?? 0,
      ref: text(c[i.ref]),
      paymentReference: text(c[i.num]) || null,
      // The link holds an initials avatar plus the name — take the name node.
      customerName: (partyLink?.lastChild?.textContent ?? text(c[i.party])).trim() || null,
      socid: param(partyLink?.getAttribute('href'), 'socid'),
      paymentDate: isoDate(text(c[i.date])),
      paymentTypeLabel: text(c[i.type]) || null,
      amount: Number(text(c[i.amount]).replace(/[^0-9.\-]/g, '')) || 0,
      bankEntryId,
      accountId: param(accountLink?.getAttribute('href'), 'id'),
      accountName: text(c[i.account]) || null,
    })
  }
  return rows
}
