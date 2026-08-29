// Parses commande/agenda.php?id=X — the full "Events/Agenda" tab page, a
// genuinely separate page from card.php's own embedded "Latest linked
// events" mini-widget (see orderCardParser.ts's parseLinkedEvents(), which
// stays as-is for that smaller widget). Verified against a real fetched
// page (order id=79), not guessed: this page's own event table carries
// different, richer columns (Ref./Date/Owner/Label/Related Objects/Status)
// than the mini-widget's (Ref./Date/By/Type/Title).

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

export interface AgendaPageData {
  createdBy: string
  creationDate: string
  latestModificationDate: string
  validatedBy: string
  validationDate: string
  events: AgendaEventRow[]
}

function stripTags(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// The header info table (Created by/Creation date/Latest modification
// date/Validated by/Validation date) has the same "value is always the raw
// value's own cell" shape used elsewhere — the "by" rows' cells are a real
// user-tooltip link, textContent still gives the clean display name.
function findHeaderRowValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<td class="titlefield">${escaped}\\s*<\\/td>\\s*<td>([\\s\\S]*?)<\\/td>\\s*<\\/tr>`)
  const m = re.exec(html)
  return m ? stripTags(m[1]) : ''
}

export function parseAgendaPageData(html: string): AgendaPageData {
  const createdBy = findHeaderRowValue(html, 'Created by')
  const creationDate = findHeaderRowValue(html, 'Creation date')
  const latestModificationDate = findHeaderRowValue(html, 'Latest modification date')
  const validatedBy = findHeaderRowValue(html, 'Validated by')
  const validationDate = findHeaderRowValue(html, 'Validation date')

  const events: AgendaEventRow[] = []
  const tableIdx = html.search(/Events\s+on\s+order/i)
  if (tableIdx !== -1) {
    const headerIdx = html.indexOf('liste_titre', tableIdx)
    const tableEnd = html.indexOf('</table>', headerIdx)
    if (headerIdx !== -1 && tableEnd !== -1) {
      const doc = new DOMParser().parseFromString(`<table>${html.slice(headerIdx, tableEnd)}</table>`, 'text/html')
      const rows = Array.from(doc.querySelectorAll('tr.oddeven'))
      // Real column count is 6 <td>s per row (Ref/Date/Owner/Label/Related
      // Objects/Status) even though the header's Owner/Label <th>s carry
      // colspan="3"/"2" for visual width — confirmed live, not guessed.
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

  return { createdBy, creationDate, latestModificationDate, validatedBy, validationDate, events }
}
