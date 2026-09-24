// Parses fourn/facture/info.php?facid=X — the "Log" tab. A genuinely
// simpler, different shape than both Sales Orders' own agenda.php
// (orderAgendaParser.ts) and the Sales Invoice rebuild's agenda.php
// (invoiceAgendaParser.ts): there is no separate events table at all here.
// Every field is crammed into a single <td>, separated by real <br> tags —
// confirmed live, invoice facid=19:
// `Created by : <a>...</a><br>Creation date: X<br>Latest modification
// date: Y<br>Validated by : <a>...</a><br>Validation date: Z<br>...`

export interface VendorInvoiceLogData {
  createdBy: string
  creationDate: string
  latestModificationDate: string
  validatedBy: string
  validationDate: string
}

function stripTags(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function findSegmentValue(segments: string[], label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${escaped}\\s*:\\s*(.*)$`, 'i')
  for (const seg of segments) {
    const m = re.exec(stripTags(seg))
    if (m) return m[1].trim()
  }
  return ''
}

export function parseVendorInvoiceLog(html: string): VendorInvoiceLogData {
  const empty: VendorInvoiceLogData = { createdBy: '', creationDate: '', latestModificationDate: '', validatedBy: '', validationDate: '' }
  const idx = html.indexOf('product-content-body')
  if (idx === -1) return empty
  const tableStart = html.indexOf('<table', idx)
  const tableEnd = html.indexOf('</table>', tableStart)
  if (tableStart === -1 || tableEnd === -1) return empty
  const segments = html.slice(tableStart, tableEnd).split(/<br\s*\/?>/i)
  return {
    createdBy: findSegmentValue(segments, 'Created by'),
    creationDate: findSegmentValue(segments, 'Creation date'),
    latestModificationDate: findSegmentValue(segments, 'Latest modification date'),
    validatedBy: findSegmentValue(segments, 'Validated by'),
    validationDate: findSegmentValue(segments, 'Validation date'),
  }
}
