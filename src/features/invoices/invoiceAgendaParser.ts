// Parses compta/facture/agenda.php?id=X — the full "Events/Agenda" tab
// page. Same generic Dolibarr agenda-list template Sales Orders' own
// agenda.php renders (orderAgendaParser.ts) — same table shape (Ref./Date/
// Owner/Label/Related Objects/Status, real rows carry class="oddeven") —
// but two real differences confirmed live (invoice facid=418), not shared
// with orders: the section title reads "Actions on invoice" (not "Events on
// order"), and the header info table carries one extra real row, "Closing
// date", that orders' own header doesn't have.

export interface AgendaEventRow {
  ref: string
  url: string
  date: string
  owner: string
  label: string
  relatedObjectRef: string
  relatedObjectUrl: string
  statusLabel: string
}

export interface InvoiceAgendaPageData {
  createdBy: string
  creationDate: string
  latestModificationDate: string
  validatedBy: string
  validationDate: string
  closingDate: string
  zraMessage: string
  /** Company TimeZone label from the topbar user panel (e.g. "UTC"), used to
   *  compute the real page's "Client time (user)" conversion alongside the
   *  scraped server-local date strings above. */
  timezone: string
  events: AgendaEventRow[]
}

function stripTags(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function findHeaderRowValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<td class="titlefield">${escaped}\\s*<\\/td>\\s*<td>([\\s\\S]*?)<\\/td>\\s*<\\/tr>`)
  const m = re.exec(html)
  return m ? stripTags(m[1]) : ''
}

function findZraMessage(html: string): string {
  const m = /<b>\s*Zra Message\s*:\s*<\/b>\s*<span[^>]*>([\s\S]*?)<\/span>/.exec(html)
  return m ? stripTags(m[1]) : ''
}

function findCompanyTimezone(html: string): string {
  const m = /<label class="text-muted">TimeZone<\/label>\s*<\/div>\s*<div class="col-6 text-end">([^<]*)<\/div>/.exec(html)
  return m ? m[1].trim() : ''
}

export function parseInvoiceAgendaPage(html: string): InvoiceAgendaPageData {
  const createdBy = findHeaderRowValue(html, 'Created by')
  const creationDate = findHeaderRowValue(html, 'Creation date')
  const latestModificationDate = findHeaderRowValue(html, 'Latest modification date')
  const validatedBy = findHeaderRowValue(html, 'Validated by')
  const validationDate = findHeaderRowValue(html, 'Validation date')
  const closingDate = findHeaderRowValue(html, 'Closing date')
  const zraMessage = findZraMessage(html)
  const timezone = findCompanyTimezone(html)

  const events: AgendaEventRow[] = []
  const tableIdx = html.search(/Actions\s+on\s+invoice/i)
  if (tableIdx !== -1) {
    const headerIdx = html.indexOf('liste_titre', tableIdx)
    const tableEnd = html.indexOf('</table>', headerIdx)
    if (headerIdx !== -1 && tableEnd !== -1) {
      const doc = new DOMParser().parseFromString(`<table>${html.slice(headerIdx, tableEnd)}</table>`, 'text/html')
      const rows = Array.from(doc.querySelectorAll('tr.oddeven'))
      for (const row of rows) {
        const cells = row.querySelectorAll(':scope > td')
        const refLink = cells[0]?.querySelector('a')
        const ownerName = cells[2]?.querySelector('.usertext')
        const relatedLink = cells[4]?.querySelector('a')
        const statusEl = cells[5]?.querySelector('[title]')
        events.push({
          ref: (refLink?.textContent ?? '').trim(),
          url: refLink?.getAttribute('href') ?? '',
          date: (cells[1]?.textContent ?? '').trim(),
          owner: (ownerName?.textContent ?? '').trim(),
          label: (cells[3]?.textContent ?? '').trim(),
          relatedObjectRef: (relatedLink?.textContent ?? '').trim(),
          relatedObjectUrl: relatedLink?.getAttribute('href') ?? '',
          statusLabel: statusEl?.getAttribute('title') ?? (cells[5]?.textContent ?? '').trim(),
        })
      }
    }
  }

  return { createdBy, creationDate, latestModificationDate, validatedBy, validationDate, closingDate, zraMessage, timezone, events }
}
