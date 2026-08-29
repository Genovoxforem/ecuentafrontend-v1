// Parses fourn/commande/info.php?id=X — the real "Events/Agenda" tab.
// dol_print_object_info() (the audit block) and show_actions_done() (the
// "Events on order" table) are the exact same generic Dolibarr functions
// Sales Orders' own commande/agenda.php page renders (see
// orderAgendaParser.ts, read directly for this reason) — Purchase Orders
// add 2 extra audit rows (Approved by/Approving date) Sales Orders don't
// have, since only supplier orders go through an approval step.

export interface PurchaseOrderAgendaEventRow {
  ref: string
  url: string
  date: string
  owner: string
  label: string
  relatedObjectRef: string
  relatedObjectUrl: string
  statusLabel: string
}

export interface PurchaseOrderInfoData {
  createdBy: string
  creationDate: string
  latestModificationDate: string
  validatedBy: string
  validationDate: string
  approvedBy: string
  approvingDate: string
  events: PurchaseOrderAgendaEventRow[]
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

export function parsePurchaseOrderInfo(html: string): PurchaseOrderInfoData {
  const createdBy = findHeaderRowValue(html, 'Created by')
  const creationDate = findHeaderRowValue(html, 'Creation date')
  const latestModificationDate = findHeaderRowValue(html, 'Latest modification date')
  const validatedBy = findHeaderRowValue(html, 'Validated by')
  const validationDate = findHeaderRowValue(html, 'Validation date')
  const approvedBy = findHeaderRowValue(html, 'Approved by')
  const approvingDate = findHeaderRowValue(html, 'Approving date')

  const events: PurchaseOrderAgendaEventRow[] = []
  const tableIdx = html.search(/Events\s+on\s+order/i)
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

  return { createdBy, creationDate, latestModificationDate, validatedBy, validationDate, approvedBy, approvingDate, events }
}
