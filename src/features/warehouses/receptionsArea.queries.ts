import { useQuery } from '@tanstack/react-query'

// Real reference page: reception/index.php's own 3 sections. No JSON exists
// anywhere under reception/ (confirmed by grep), but all 3 sections are
// plain classic HTML tables rendered directly in this one page's own
// initial response — a single real fetch, no per-record follow-ups needed.
// Real SQL per section (read directly from source):
//   Receptions To Validate:    llx_reception WHERE fk_statut = 0
//   Latest 3 Receptions:       llx_reception WHERE fk_statut = 1,
//                              ORDER BY date_delivery DESC LIMIT 3,
//                              joined to its origin llx_commande_fournisseur
//                              and llx_societe for the customer name
//   Purchase Orders To Process: llx_commande_fournisseur WHERE fk_statut IN
//                              (STATUS_ORDERSENT=3, STATUS_RECEIVED_PARTIALLY=4)
// Confirmed live: real ids/refs/customer names/PO refs for all 3 real
// receptions on this install (RCP2604-0001/2/3, socids 1976/1980/1989,
// PO2604-0001/2/3) and the "Purchase orders to process" badge count (3).
export interface ReceptionLinkRow {
  ref: string
  id: number
  customerName: string
  socid: number | null
  poRef: string
  poId: number | null
}

export interface PendingPurchaseOrderRow {
  ref: string
  id: number
  customerName: string
  socid: number | null
}

export interface ReceptionsAreaData {
  receptionsToValidate: ReceptionLinkRow[]
  latestReceptions: ReceptionLinkRow[]
  purchaseOrdersToProcess: PendingPurchaseOrderRow[]
}

function extractSection(html: string, headerText: string): string | null {
  const headerIdx = html.indexOf(headerText)
  if (headerIdx === -1) return null
  const tableEnd = html.indexOf('</table>', headerIdx)
  if (tableEnd === -1) return null
  return html.slice(headerIdx, tableEnd)
}

function parseReceptionRows(sectionHtml: string): ReceptionLinkRow[] {
  const rows: ReceptionLinkRow[] = []
  const rowRe = /<tr class="oddeven">([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(sectionHtml))) {
    const rowHtml = m[1]
    const receptionRefMatch = rowHtml.match(/reception\/card\.php\?id=(\d+)">([^<]+)<\/a>/)
    const customerMatch = rowHtml.match(/comm\/card\.php\?socid=(\d+)"[^>]*>[\s\S]*?<\/span>\s*([^<]*)<\/a>/)
    const poMatch = rowHtml.match(/purchaseorder\/index_v2\.php\?id=(\d+)"[^>]*>[\s\S]*?<\/span>([^<]*)<\/a>/)
    if (!receptionRefMatch) continue
    rows.push({
      ref: receptionRefMatch[2].trim(),
      id: Number(receptionRefMatch[1]),
      customerName: customerMatch ? customerMatch[2].trim() : '',
      socid: customerMatch ? Number(customerMatch[1]) : null,
      poRef: poMatch ? poMatch[2].trim() : '',
      poId: poMatch ? Number(poMatch[1]) : null,
    })
  }
  return rows
}

function parsePendingPurchaseOrderRows(sectionHtml: string): PendingPurchaseOrderRow[] {
  const rows: PendingPurchaseOrderRow[] = []
  const rowRe = /<tr class="oddeven">([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(sectionHtml))) {
    const rowHtml = m[1]
    const poMatch = rowHtml.match(/purchaseorder\/index_v2\.php\?id=(\d+)"[^>]*>[\s\S]*?<\/span>([^<]*)<\/a>/)
    const customerMatch = rowHtml.match(/comm\/card\.php\?socid=(\d+)"/)
    const customerNameMatch = rowHtml.match(/avatar-circle"[^>]*>[^<]*<\/div>([^<]*)<\/a>/)
    if (!poMatch) continue
    rows.push({
      ref: poMatch[2].trim(),
      id: Number(poMatch[1]),
      customerName: customerNameMatch ? customerNameMatch[1].trim() : '',
      socid: customerMatch ? Number(customerMatch[1]) : null,
    })
  }
  return rows
}

function parseReceptionsAreaData(html: string): ReceptionsAreaData {
  const toValidateSection = extractSection(html, 'Receptions to validate')
  const latestSection = extractSection(html, 'Latest 3 receptions')
  const toProcessSection = extractSection(html, 'Purchase orders to process')

  return {
    receptionsToValidate: toValidateSection ? parseReceptionRows(toValidateSection) : [],
    latestReceptions: latestSection ? parseReceptionRows(latestSection) : [],
    purchaseOrdersToProcess: toProcessSection ? parsePendingPurchaseOrderRows(toProcessSection) : [],
  }
}

export function useReceptionsArea() {
  return useQuery({
    queryKey: ['warehouses', 'receptionsArea'],
    queryFn: async (): Promise<ReceptionsAreaData> => {
      const res = await fetch('/reception/index.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseReceptionsAreaData(await res.text())
    },
    staleTime: 1000 * 30,
  })
}
