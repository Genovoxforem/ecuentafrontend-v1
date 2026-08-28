// Parses comm/propal/agenda.php?id=X — the real "Events/Agenda" tab.
// dol_print_object_info() (the audit block) and show_actions_done() (the
// "Events On Proposal" table) are the exact same generic Dolibarr functions
// already parsed for Purchase Orders' own info.php (see
// purchaseOrderInfoParser.ts, read directly for this reason) — reused here
// by the same technique. Quotations swap in "Closing Date" where Purchase
// Orders have Approved by/Approving date, since only supplier orders go
// through an approval step.

export interface QuotationAgendaEventRow {
  ref: string
  url: string
  date: string
  owner: string
  label: string
  relatedObjectRef: string
  relatedObjectUrl: string
  statusLabel: string
}

export interface QuotationAgendaData {
  createdBy: string
  creationDate: string
  latestModificationDate: string
  validatedBy: string
  validationDate: string
  closingDate: string
  events: QuotationAgendaEventRow[]
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

export function parseQuotationAgenda(html: string): QuotationAgendaData {
  const createdBy = findHeaderRowValue(html, 'Created by')
  const creationDate = findHeaderRowValue(html, 'Creation date')
  const latestModificationDate = findHeaderRowValue(html, 'Latest modification date')
  const validatedBy = findHeaderRowValue(html, 'Validated by')
  const validationDate = findHeaderRowValue(html, 'Validation date')
  const closingDate = findHeaderRowValue(html, 'Closing date')

  const events: QuotationAgendaEventRow[] = []
  const tableIdx = html.search(/Events\s+[Oo]n\s+[Pp]ropo(sal|osal)/)
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

  return { createdBy, creationDate, latestModificationDate, validatedBy, validationDate, closingDate, events }
}
