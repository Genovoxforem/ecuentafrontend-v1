// Parses compta/facture/ledgerentry.php?facid=X — the "LedgerEntry" tab, a
// simple real table (not shared with any other feature in this app):
// Date/Accounting Doc./Ref./CodeJournal/Account/Label/Debit/Credit/Amount,
// one row per real posted accounting movement for this invoice, plus one
// `tr.liste_total` "Balance" row. Confirmed live (invoice facid=418).
//
// Note: this same page also embeds an unrelated "recent vouchers" widget
// (Voucher No/Particulars/Mode/...) as page-wide chrome ABOVE the actual
// tab content, shared with other pages on this backend — that table sits
// outside the `.product-content-body` region this parser reads from and is
// intentionally not what's parsed here.

export interface InvoiceLedgerEntryRow {
  date: string
  accountingDoc: string
  ref: string
  codeJournal: string
  account: string
  label: string
  debit: string
  credit: string
  amount: string
}

export interface InvoiceLedgerEntryData {
  rows: InvoiceLedgerEntryRow[]
  totalDebit: string
  totalCredit: string
  balance: string
}

function stripTags(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function parseInvoiceLedgerEntryHtml(html: string): InvoiceLedgerEntryData {
  const bodyIdx = html.indexOf('product-content-body')
  if (bodyIdx === -1) return { rows: [], totalDebit: '', totalCredit: '', balance: '' }
  const tableStart = html.indexOf('<table', bodyIdx)
  const tableEnd = html.indexOf('</table>', tableStart)
  if (tableStart === -1 || tableEnd === -1) return { rows: [], totalDebit: '', totalCredit: '', balance: '' }

  const doc = new DOMParser().parseFromString(html.slice(tableStart, tableEnd + '</table>'.length), 'text/html')

  const rows: InvoiceLedgerEntryRow[] = Array.from(doc.querySelectorAll('tr.oddeven')).map((row) => {
    const cells = row.querySelectorAll('td')
    return {
      date: (cells[0]?.textContent ?? '').trim(),
      accountingDoc: (cells[1]?.textContent ?? '').trim(),
      ref: (cells[2]?.textContent ?? '').trim(),
      codeJournal: (cells[3]?.textContent ?? '').trim(),
      account: (cells[4]?.textContent ?? '').trim(),
      label: (cells[5]?.textContent ?? '').trim(),
      debit: (cells[6]?.textContent ?? '').trim(),
      credit: (cells[7]?.textContent ?? '').trim(),
      amount: (cells[8]?.textContent ?? '').trim(),
    }
  })

  const totalRow = doc.querySelector('tr.liste_total')
  const totalCells = totalRow?.querySelectorAll('td') ?? []
  const totalDebit = stripTags(totalCells[1]?.innerHTML ?? '')
  const totalCredit = stripTags(totalCells[2]?.innerHTML ?? '')
  const balance = stripTags(totalCells[3]?.innerHTML ?? '')

  return { rows, totalDebit, totalCredit, balance }
}
