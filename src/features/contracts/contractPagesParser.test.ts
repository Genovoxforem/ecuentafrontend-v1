import { describe, expect, it } from 'vitest'
import { parseContractListStats, parseContractServiceRows } from './contractPagesParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Markup copied from real contrat/list.php and contrat/services_list.php pages.
const card = (title: string, a: [string, string], b: [string, string]) =>
  `<div class="ec-report-stats"><div class="ec-report-stats-title">${title}</div><div class="ec-report-stats-box twobox">` +
  [a, b].map(([v, l]) => `<div class="ec-report-stats-content"><div class="ec-report-stats-value">${v}</div><div class="ec-report-stats-sub">${l}</div></div>`).join('') +
  '</div></div>'

describe('parseContractListStats', () => {
  it('reads every value by its label under the number', () => {
    const doc = parse(
      card('Contract overview', ['6', 'Total contracts'], ['1', 'Created this month']) +
        card('Running status', ['2', 'Running total'], ['3', 'Started this month']) +
        card('Expiry status', ['4', 'Expired'], ['5', 'Expired this month']) +
        card('Closure and followup', ['7', 'Closed'], ['8', 'This month followups']),
    )
    expect(parseContractListStats(doc)).toEqual({
      totalContracts: 6,
      createdThisMonth: 1,
      runningTotal: 2,
      startedThisMonth: 3,
      expiredCount: 4,
      expiredThisMonth: 5,
      closedCount: 7,
      followupsThisMonth: 8,
    })
  })

  it('refuses a page that has no contract statistics', () => {
    expect(() => parseContractListStats(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})

const servicesTable = (rows: string) =>
  `<table id="example" class="table"><thead><tr><th>#</th><th>Contract</th><th>Service</th><th>Third-party</th><th>Planned start date</th><th>Real start date</th><th>Planned end date</th><th>Real end date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`

const serviceRow =
  '<tr><td><input type="checkbox" name="toselect[]" value="2"></td>' +
  '<td><a href="/contrat/card.php?id=2&save_lastsearch_values=1"><span class="fas"></span>CT2604-0002</a></td>' +
  '<td><a href="/productinfo/index.php?id=27" data-geo="tip"><div class="d-flex"><span class="small text-muted">Ref: S02</span></div></a> - Ecuenta Applicat…</td>' +
  '<td><a href="/comm/card.php?socid=9&save_lastsearch_values=1"><div class="avatar-circle" style="width: 32px;">CU</div>Customer2</a></td>' +
  '<td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td>04/20/2026 10:22 AM</td><td>&nbsp;</td><td></td>' +
  '<td class="custumRight"><span class="badge badge-status4 badge-status" title="Running, not expired">Not expired</span></td></tr>'

describe('parseContractServiceRows', () => {
  it('reads contract, service, third party, the four dates and the status', () => {
    const [row] = parseContractServiceRows(parse(servicesTable(serviceRow)))
    expect(row).toEqual({
      contractId: 2,
      contractRef: 'CT2604-0002',
      serviceRef: 'S02',
      service: 'Ecuenta Applicat…',
      vendorOrCustomerId: 9,
      thirdParty: 'Customer2',
      plannedStart: '',
      realStart: '04/20/2026 10:22 AM',
      plannedEnd: '',
      realEnd: '',
      status: 'Not expired',
    })
  })

  it('returns no rows for an empty table and refuses a page without the table', () => {
    expect(parseContractServiceRows(parse(servicesTable('')))).toEqual([])
    expect(() => parseContractServiceRows(parse('<table><thead><tr><th>Other</th></tr></thead></table>'))).toThrow(/not recognised/)
  })
})
