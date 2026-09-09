import { useQuery } from '@tanstack/react-query'

// Real reference page: reception/list.php (List Of Receptions, and its
// Draft/Validated/Processed nav variants via the same page's own
// ?viewstatut=0/1/2 filter — confirmed live from source). No JSON exists
// under reception/ (confirmed by grep across the whole directory), but
// unlike expedition/list.php, City/Zip/Third-Party are already part of the
// SAME real SQL join this page's own table renders (LEFT JOIN llx_societe)
// — no per-record follow-up fetch needed at all, just one real page fetch.
export interface ReceptionListRow {
  id: number
  ref: string
  refVendor: string
  thirdPartyName: string
  socid: number | null
  city: string
  zip: string
  plannedDeliveryDate: string
  status: string
  billed: string
}

function parseReceptionList(html: string): ReceptionListRow[] {
  const rows: ReceptionListRow[] = []
  const tbodyStart = html.indexOf('<tbody>')
  const tbodyEnd = html.indexOf('</tbody>', tbodyStart)
  if (tbodyStart === -1 || tbodyEnd === -1) return rows
  const tbodyHtml = html.slice(tbodyStart, tbodyEnd)

  const rowRe = /<tr>([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(tbodyHtml))) {
    const rowHtml = m[1]
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g
    const cells: string[] = []
    let c: RegExpExecArray | null
    while ((c = cellRe.exec(rowHtml))) cells.push(c[1])
    if (cells.length < 8) continue

    const refMatch = cells[0].match(/reception\/card\.php\?id=(\d+)">([^<]+)<\/a>/)
    if (!refMatch) continue
    const refVendor = cells[1].replace(/<[^>]*>/g, '').trim()
    const customerMatch = cells[2].match(/socid=(\d+)[^"]*"[^>]*>[\s\S]*?<\/div>([^<]*)<\/a>/)
    const city = cells[3].replace(/<[^>]*>/g, '').trim()
    const zip = cells[4].replace(/<[^>]*>/g, '').trim()
    const plannedDeliveryDate = cells[5].replace(/<[^>]*>/g, '').trim()
    const statusMatch = cells[6].match(/title="[^"]*">([^<]*)<\/span>/)
    const billed = cells[7].replace(/<[^>]*>/g, '').trim()

    rows.push({
      id: Number(refMatch[1]),
      ref: refMatch[2].trim(),
      refVendor,
      thirdPartyName: customerMatch ? customerMatch[2].trim() : '',
      socid: customerMatch ? Number(customerMatch[1]) : null,
      city,
      zip,
      plannedDeliveryDate,
      status: statusMatch ? statusMatch[1] : '',
      billed,
    })
  }
  return rows
}

export function useReceptionList(statusFilter?: number) {
  return useQuery({
    queryKey: ['warehouses', 'receptionList', statusFilter],
    queryFn: async (): Promise<ReceptionListRow[]> => {
      const params = statusFilter !== undefined ? `?viewstatut=${statusFilter}` : ''
      const res = await fetch(`/reception/list.php${params}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseReceptionList(await res.text())
    },
    staleTime: 1000 * 30,
  })
}
