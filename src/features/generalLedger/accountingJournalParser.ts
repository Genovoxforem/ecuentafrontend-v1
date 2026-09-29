// accountancy/journal/{bankjournal,expensereportsjournal,sellsjournal,
// purchasesjournal}.php — Dolibarr's four per-type journal reports. Confirmed
// live against 172.16.5.10 (and .55 for the setup warning): all four share one
// layout — a POST/GET form (token, action, date_start/date_end as MM/dd/yyyy
// plus hidden day/month/year triplets, in_bookkeeping select, submit=Refresh)
// inside a "Filter" card (Name / Report period / Status / Description), two
// JS buttons that re-submit that form with action=exportcsv /
// action=writebookkeeping, and one transaction table. The table's CSS class
// differs per page (`table-sm align-middle noborderRemove` vs
// `newCustomUItable noborderRemove`), so it is found by its header instead,
// and columns are mapped by header text because the Finance journal has an
// extra "Payment Type" column the other three lack.

export interface JournalRow {
  date: string
  doc: string
  account: string
  subledger: string
  label: string
  partyName: string // customer/supplier shown at the end of the label cell
  partyId: string
  paymentType: string
  debit: number
  credit: number
  // As the page prints them (thousands separators, up to four decimals).
  debitText: string
  creditText: string
}

// A setup warning box of the page, and the menu entry it points at (the bold phrase, e.g.
// "Accounting-Setup-Bank accounts"), so the screen can link that phrase to the native setup page.
export interface JournalWarning {
  text: string
  link: string
}

export interface JournalPage {
  title: string
  name: string
  description: string
  token: string
  dateStart: string // MM/dd/yyyy, as the real form holds it
  dateEnd: string
  inBookkeeping: string
  inBookkeepingOptions: { value: string; label: string }[]
  warnings: JournalWarning[]
  docHeader: string
  hasPaymentType: boolean
  rows: JournalRow[]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function num(s: string): number {
  const n = Number(s.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

// The label cell holds the operation text plus (often) a third-party link with
// an initials avatar — split them so the avatar initials don't glue onto the name.
function labelParts(cell: Element | undefined): { label: string; partyName: string; partyId: string } {
  if (!cell) return { label: '', partyName: '', partyId: '' }
  const clone = cell.cloneNode(true) as Element
  const link = clone.querySelector('a[href*="socid="]')
  const partyId = new URLSearchParams((link?.getAttribute('href') ?? '').split('?')[1] ?? '').get('socid') ?? ''
  link?.querySelectorAll('.avatar-circle').forEach((a) => a.remove())
  const partyName = text(link)
  link?.remove()
  // Keep the trailing " -" — it is what joins the label to the party name on screen.
  return { label: text(clone), partyName, partyId }
}

export function parseAccountingJournal(doc: Document): JournalPage {
  const form = Array.from(doc.querySelectorAll('form')).find((f) => f.querySelector('[name="date_start"]'))
  const val = (name: string) => form?.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? ''

  const inBookkeepingOptions = Array.from(form?.querySelectorAll<HTMLOptionElement>('select[name="in_bookkeeping"] option') ?? [])
    .map((o) => ({ value: o.value, label: text(o) }))
    .filter((o) => o.value)

  // "Name" / "Description" live in the Filter card as label.form-label +
  // following .form-control-plaintext.
  const plain = (label: string) => {
    const l = Array.from(form?.querySelectorAll('label.form-label') ?? []).find((x) => text(x) === label)
    // The description is several lines separated by <br>; keep them as lines.
    const copy = l?.nextElementSibling?.cloneNode(true) as Element | undefined
    copy?.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
    return (copy?.textContent ?? '')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
  }

  const table = Array.from(doc.querySelectorAll('table')).find((t) => /^Date\s*Accounting Doc/i.test(text(t.querySelector('tr'))))
  const headers = Array.from(table?.querySelector('tr')?.children ?? []).map((c) => text(c).toLowerCase())
  const col = (re: RegExp) => headers.findIndex((h) => re.test(h))
  const idx = {
    date: col(/^date/),
    doc: col(/^accounting doc/),
    account: col(/^accounting account/),
    subledger: col(/^subledger/),
    label: col(/^label/),
    payment: col(/^payment/),
    debit: col(/^debit/),
    credit: col(/^credit/),
  }
  const at = (cells: NodeListOf<HTMLTableCellElement>, i: number) => (i >= 0 ? text(cells[i]) : '')

  const rows: JournalRow[] = Array.from(table?.querySelectorAll('tr.oddeven') ?? [])
    .map((tr) => {
      const c = tr.querySelectorAll('td')
      if (c.length < headers.length) return null
      return {
        date: at(c, idx.date),
        doc: at(c, idx.doc),
        account: at(c, idx.account),
        subledger: at(c, idx.subledger),
        ...labelParts(c[idx.label]),
        paymentType: at(c, idx.payment),
        debit: num(at(c, idx.debit)),
        credit: num(at(c, idx.credit)),
        debitText: at(c, idx.debit),
        creditText: at(c, idx.credit),
      }
    })
    .filter((r): r is JournalRow => r !== null)

  return {
    title: text(doc.querySelector('.ecnta-title, .titre_page, .titlewithicon')) || 'Journal Area',
    name: plain('Name'),
    description: plain('Description'),
    token: val('token'),
    dateStart: val('date_start'),
    dateEnd: val('date_end'),
    inBookkeeping: form?.querySelector<HTMLSelectElement>('select[name="in_bookkeeping"]')?.value ?? '',
    inBookkeepingOptions,
    // Dolibarr prints `div.warning`; this backend's skin prints `div.alert-warning`.
    warnings: Array.from(doc.querySelectorAll('div.warning, div.alert-warning'))
      .map((w) => ({ text: text(w), link: text(w.querySelector('strong')) }))
      .filter((w) => w.text),
    docHeader: idx.doc >= 0 ? text(table?.querySelector('tr')?.children[idx.doc]) : 'Accounting Doc.',
    hasPaymentType: idx.payment >= 0,
    rows,
  }
}
