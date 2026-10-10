import { describe, expect, it } from 'vitest'
import { balancedJsonAt, parseLegacyHomeDashboard, parseLegacyNumber } from './mainDashboardParser'
// The real index.php dashboard of 172.16.5.10 (2026-10-05), cut down: two rows
// per table, two bank rows, tooltips dropped, and its scripts reduced to the
// donut data and the analytics data (week + year) the parser reads.
import FIXTURE from './mainDashboardParser.fixture.html?raw'

describe('parseLegacyNumber', () => {
  it('reads price() output and plain counts', () => {
    expect(parseLegacyNumber('ZMW 116,094.00')).toBe(116094)
    expect(parseLegacyNumber('1,182,606.00  ZMW')).toBe(1182606)
    expect(parseLegacyNumber('-76.00  ZMW')).toBe(-76)
    expect(parseLegacyNumber('5816')).toBe(5816)
    expect(parseLegacyNumber('1.234,56')).toBe(1234.56)
    expect(parseLegacyNumber('100.0%')).toBe(100)
    expect(parseLegacyNumber('—')).toBeNull()
  })
})

describe('balancedJsonAt', () => {
  it('cuts one JSON value out of a JS object literal', () => {
    const src = 'x = { sales: {"a":[1,{"b":"}"}]}, purchase: {"c":2} };'
    expect(balancedJsonAt(src, src.indexOf('sales:'))).toBe('{"a":[1,{"b":"}"}]}')
  })
})

describe('parseLegacyHomeDashboard', () => {
  const dash = parseLegacyHomeDashboard(FIXTURE)

  it('is null for a page without the dashboard (login page, user dashboard)', () => {
    expect(parseLegacyHomeDashboard('<html><body><form><input name="password"></form></body></html>')).toBeNull()
  })

  it('reads the four KPI cards with their meta line and trend', () => {
    expect(dash?.kpis.map((k) => [k.key, k.value, k.currency, k.meta])).toEqual([
      ['todaySales', 0, 'ZMW', '0 invoices today'],
      ['todayPurchase', 0, 'ZMW', '0 invoices today'],
      ['unpaid', 116094, 'ZMW', '77 invoices outstanding'],
      ['zraSigned', 171, '', 'This fiscal year'],
    ])
    expect(dash?.kpis[0].trend).toEqual({ percent: 100, up: false })
    expect(dash?.kpis[0].spark).toHaveLength(12)
    expect(dash?.kpis[2].spark).toEqual([])
  })

  it('reads the sales tab: donut counts, tiles, summary and analytics series', () => {
    const sales = dash!.sales
    expect(sales.donut).toEqual([
      { label: 'Completed', count: 161, percent: 54 },
      { label: 'Started', count: 85, percent: 29 },
      { label: 'Draft', count: 50, percent: 17 },
      { label: 'Refund', count: 0, percent: 0 },
    ])
    expect(sales.tiles).toEqual([
      { label: 'Sales Orders', value: 110 },
      { label: 'Quotations', value: 16 },
      { label: 'Contracts', value: 6 },
    ])
    expect(sales.summary.map((s) => [s.label, s.value])).toEqual([
      ['Income', 1207128],
      ['Sales', 241],
      ['Customers', 15],
    ])
    expect(sales.periods.year?.labels[0]).toBe('Jan')
    // The year's sales counts come as strings ("14") in the page's JSON.
    expect(sales.periods.year?.sales.reduce((a, b) => a + b, 0)).toBe(241)
    expect(sales.periods.week?.income).toEqual([0, 0, 116, 0, 0, 70, 0])
    expect(sales.periods.today).toBeUndefined()
  })

  it('reads the Last 7 rows with their React-routable links', () => {
    expect(dash?.sales.last7[0]).toEqual({
      ref: 'INOV-26-0035',
      id: 346,
      href: '/compta/sales/card.php?facid=346',
      party: 'David',
      partyId: 10,
      amount: 70,
      date: '04 Oct 2026',
      status: 'Not paid',
      statusCode: 1,
    })
    expect(dash?.purchase.last7[0]).toMatchObject({ ref: 'SI2609-0148', id: 183, party: 'AUTOWORLD LIMITED', partyId: 2012, amount: 25, status: 'Paid', statusCode: 6 })
  })

  it('reads Last 7 rows when those cards are outside their tab panes', () => {
    const doc = new DOMParser().parseFromString(FIXTURE, 'text/html')
    const dashboard = doc.querySelector('.erp-dash')!
    for (const kind of ['sales', 'purchase']) {
      const pane = doc.getElementById(kind === 'sales' ? 'salesTab' : 'purchaseTab')!
      const titlePattern = kind === 'sales' ? /^last\s*7\s+sales\b/i : /^last\s*7\s+purchases?\b/i
      const card = Array.from(pane.querySelectorAll('.erp-card')).find((candidate) =>
        titlePattern.test(candidate.querySelector('.erp-card__title')?.textContent?.trim() ?? ''),
      )
      expect(card).toBeDefined()
      dashboard.append(card!)
    }

    const movedCardsDashboard = parseLegacyHomeDashboard(doc.documentElement.innerHTML)
    expect(movedCardsDashboard?.sales.last7[0]?.ref).toBe('INOV-26-0035')
    expect(movedCardsDashboard?.purchase.last7[0]?.ref).toBe('SI2609-0148')
  })

  it('reads the by-country rows and the map markers of each tab', () => {
    expect(dash?.sales.countries).toEqual([
      { code: 'zm', name: 'Zambie', amount: 1182606, percent: 98 },
      { code: 'in', name: 'India', amount: 14276, percent: 1 },
      { code: 'je', name: 'Jersey', amount: 9186, percent: 1 },
      { code: 'us', name: 'United States', amount: 1622, percent: 0 },
    ])
    expect(dash?.sales.markers.map((m) => m.name)).toEqual(['ZM', 'IN', 'US'])
    expect(dash?.sales.lines).toEqual([
      { from: 'IN', to: 'ZM' },
      { from: 'US', to: 'ZM' },
    ])
    expect(dash?.purchase.countries[1]).toEqual({ code: 'in', name: 'India', amount: 245126, percent: 22 })
    expect(dash?.purchase.tiles.map((t) => t.label)).toEqual(['Purchase Orders', 'Proposals', 'Asycuda'])
  })

  it('reads the side stack: bank rows (no names on this backend), attention items, quick actions', () => {
    expect(dash?.banks).toEqual([
      { name: '', id: null, percent: 28, amount: 187492 },
      { name: '', id: null, percent: 22, amount: 144728 },
    ])
    expect(dash?.attention.map((a) => [a.title, a.count, a.href, a.variant])).toEqual([
      ['77 unpaid invoices', 77, '/compta/facture/list.php?search_status=1', 'warning'],
      ['10 quotations pending', 10, '/comm/propal/list.php', 'primary'],
      ['67 ZRA sync warnings', 67, '/custom/zra/zraindex.php', 'danger'],
      ['415 unmatched bank transactions', 415, '/compta/bank/list.php', 'info'],
    ])
    expect(dash?.quickActions.map((a) => a.label)).toEqual(['New Sale', 'Create Invoice', 'Add Product', 'New Purchase', 'Add Customer', 'ZRA Sync'])
    expect(dash?.cashSession).toBeNull()
  })
})
