// Parsers for two server-rendered pages of the contract module, verified live
// against the dev backends: contrat/list.php's stat cards and
// contrat/services_list.php's table of contract service lines.

export interface ContractListStats {
  totalContracts: number
  createdThisMonth: number
  runningTotal: number
  startedThisMonth: number
  expiredCount: number
  expiredThisMonth: number
  closedCount: number
  followupsThisMonth: number
}

// Each stat card holds two `.ec-report-stats-content` blocks — a value and the
// label under it ("Total contracts", "Created this month", "Running total", …) —
// so values are looked up by that label rather than by position.
export function parseContractListStats(doc: Document): ContractListStats {
  const byLabel = new Map<string, number>()
  doc.querySelectorAll('.ec-report-stats-content').forEach((block) => {
    const label = (block.querySelector('.ec-report-stats-sub')?.textContent ?? '').trim().toLowerCase()
    const value = Number((block.querySelector('.ec-report-stats-value')?.textContent ?? '').replace(/,/g, '').trim())
    if (label) byLabel.set(label, Number.isFinite(value) ? value : 0)
  })
  if (!byLabel.has('total contracts')) throw new Error('The contract statistics on this backend page were not recognised.')
  const get = (label: string) => byLabel.get(label) ?? 0
  return {
    totalContracts: get('total contracts'),
    createdThisMonth: get('created this month'),
    runningTotal: get('running total'),
    startedThisMonth: get('started this month'),
    expiredCount: get('expired'),
    expiredThisMonth: get('expired this month'),
    closedCount: get('closed'),
    followupsThisMonth: get('this month followups'),
  }
}

export interface ContractServiceRow {
  contractId: number | null
  contractRef: string
  serviceRef: string
  service: string
  vendorOrCustomerId: number | null
  thirdParty: string
  plannedStart: string
  realStart: string
  plannedEnd: string
  realEnd: string
  status: string
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

// Rows of the "Services" table (the one whose header has "Planned start date").
// Columns: checkbox, contract, service (product link, then " - label"), third
// party, planned start, real start, planned end, real end, status badge.
export function parseContractServiceRows(doc: Document): ContractServiceRow[] {
  const table = Array.from(doc.querySelectorAll('table')).find((t) => /planned start date/i.test(t.querySelector('thead')?.textContent ?? ''))
  if (!table) throw new Error('The services table on this backend page was not recognised.')
  const rows: ContractServiceRow[] = []
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const cells = tr.querySelectorAll(':scope > td')
    if (cells.length < 9) return

    const contractLink = cells[1].querySelector('a')
    const contractId = contractLink?.getAttribute('href')?.match(/[?&]id=(\d+)/)?.[1]

    const serviceCell = cells[2].cloneNode(true) as Element
    const productLink = serviceCell.querySelector('a')
    const serviceRef = clean(productLink?.textContent).replace(/^Ref:\s*/i, '')
    productLink?.remove()

    const thirdPartyLink = cells[3].querySelector('a')
    const thirdPartyClone = thirdPartyLink?.cloneNode(true) as Element | undefined
    thirdPartyClone?.querySelectorAll('.avatar-circle').forEach((el) => el.remove())
    const socid = thirdPartyLink?.getAttribute('href')?.match(/[?&]socid=(\d+)/)?.[1]

    rows.push({
      contractId: contractId ? Number(contractId) : null,
      contractRef: clean(contractLink?.textContent),
      serviceRef,
      service: clean(serviceCell.textContent).replace(/^-\s*/, ''),
      vendorOrCustomerId: socid ? Number(socid) : null,
      thirdParty: clean(thirdPartyClone?.textContent) || clean(cells[3].textContent),
      plannedStart: clean(cells[4].textContent),
      realStart: clean(cells[5].textContent),
      plannedEnd: clean(cells[6].textContent),
      realEnd: clean(cells[7].textContent),
      status: clean(cells[8].querySelector('.badge')?.textContent) || clean(cells[8].textContent),
    })
  })
  return rows
}
