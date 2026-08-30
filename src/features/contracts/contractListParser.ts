// Parses contrat/list_ajax.php's own DataTables rows — every cell is
// server-built HTML (Contrat::getNomUrl()/Societe::getNomUrl()/status
// badges), not a clean value, confirmed by reading that file directly.
//
// Real, confirmed backend bug in that same file: its default sort column
// (used whenever the request's columns[<sorted index>].data value isn't in
// its own $columnMap) is the literal string 'cf.date_commande' — an alias
// that doesn't exist anywhere in this query's FROM clause (it uses c/s/cd/
// typent/state, not cf). ORDER BY that name makes the whole SQL query fail
// silently (the file's own `if ($resql)` guard swallows the error), so a
// request that omits a valid columns[0][data] gets recordsTotal correct but
// an always-empty data[] — confirmed live. Always send
// columns[0][data]=ref (present in $columnMap) to avoid hitting this.

function cellText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function firstHref(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.querySelector('a')?.getAttribute('href') ?? null
}

function badgeCount(html: string): number {
  if (!html) return 0
  const n = Number(cellText(html))
  return Number.isFinite(n) ? n : 0
}

export interface RawContractListRow {
  ref: string
  ref_customer: string
  ref_supplier: string
  company: string
  sales_representatives: string
  date: string
  end_date: string
  status_not_running: string
  status_running: string
  status_expired: string
  status_closed: string
}

export interface ContractListRow {
  id: number | null
  ref: string
  refUrl: string | null
  refCustomer: string
  refVendor: string
  thirdParty: string
  thirdPartySubtitle: string
  thirdPartyUrl: string | null
  salesRep: string
  contractDate: string
  endDateOfServices: string
  notRunning: number
  inProgress: number
  expired: number
  closed: number
}

export function parseContractListRow(raw: RawContractListRow): ContractListRow {
  const refHref = firstHref(raw.ref)
  const idMatch = refHref?.match(/[?&]id=(\d+)/)
  const companyDoc = new DOMParser().parseFromString(raw.company, 'text/html')
  const companyAnchor = companyDoc.querySelector('a')
  const companySmall = companyDoc.querySelector('small')

  return {
    id: idMatch ? Number(idMatch[1]) : null,
    ref: cellText(raw.ref).replace(/^\s*Late\s*/i, '').trim(),
    refUrl: refHref,
    refCustomer: raw.ref_customer ?? '',
    refVendor: raw.ref_supplier ?? '',
    thirdParty: (companyAnchor?.textContent ?? cellText(raw.company)).trim(),
    thirdPartySubtitle: (companySmall?.textContent ?? '').trim(),
    thirdPartyUrl: companyAnchor?.getAttribute('href') ?? null,
    salesRep: cellText(raw.sales_representatives),
    contractDate: raw.date ?? '',
    endDateOfServices: raw.end_date ?? '',
    notRunning: badgeCount(raw.status_not_running),
    inProgress: badgeCount(raw.status_running),
    expired: badgeCount(raw.status_expired),
    closed: badgeCount(raw.status_closed),
  }
}
