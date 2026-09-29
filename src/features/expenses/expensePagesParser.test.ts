import { describe, expect, it } from 'vitest'
import { parseApprovals, parseExpenseCreateForm, parseExpenseDashboard, parseParty, parsePayments } from './expensePagesParser'

// The hover card the backend prints on every user link (`data-geo`), trimmed from a real response.
const TIP =
  '&lt;div class=&quot;photointooltip floatright avatar avatar-xs&quot;&gt;&lt;img alt=&quot;&quot; height=&quot;60&quot; src=&quot;/viewimage.php?modulepart=userphoto&amp;amp;entity=1&amp;amp;file=16%2Fphotos%2Fthumbs%2Fgeno_small.jpeg&amp;amp;cache=1&quot;&gt;&lt;/div&gt;' +
  '&lt;div class=&quot;centpercent divtooltip&quot;&gt;&lt;span class=&quot;me-1 fas fa-user infobox-adherent &quot;&gt;&lt;/span&gt; &lt;u class=&quot;paddingrightonly&quot;&gt;User&lt;/u&gt; &lt;span class=&quot;badge badge-status4 badge-status&quot; title=&quot;Enabled&quot;&gt;Enabled&lt;/span&gt;' +
  '&lt;br&gt;&lt;b&gt;Name:&lt;/b&gt; Geno browin&lt;br&gt;&lt;b&gt;Login:&lt;/b&gt; geno&lt;br&gt;&lt;b&gt;Email:&lt;/b&gt; genobrowin@gmail.com&lt;br&gt;&lt;b&gt;Administrator&lt;/b&gt;: Yes&lt;br&gt;&lt;b&gt;Type:&lt;/b&gt; Internal user&lt;/div&gt;'

const USER_LINK = `<i class="fas fa-user text-info me-1"></i><a href="/userprofile/index.php?id=16" data-geo="${TIP}" class="classforajaxtooltip"><div class="d-flex align-items-center"><span class="avatar avatar-xxs rounded-circle nopadding userimg"><span class="me-1 fas fa-user infobox-adherent "></span></span><span class="nopadding usertext">Geno browin</span></div></a>`

describe('parseParty', () => {
  it('reads a user link and its hover card', () => {
    const p = parseParty(USER_LINK)
    expect(p).toMatchObject({ kind: 'user', icon: 'user', id: '16', name: 'Geno browin', href: '/userprofile/index.php?id=16', enabled: true })
    expect(p?.photo).toBe('/viewimage.php?modulepart=userphoto&entity=1&file=16%2Fphotos%2Fthumbs%2Fgeno_small.jpeg&cache=1')
    expect(p?.facts).toEqual([
      { label: 'Name', value: 'Geno browin' },
      { label: 'Login', value: 'geno' },
      { label: 'Email', value: 'genobrowin@gmail.com' },
      { label: 'Administrator', value: 'Yes' },
      { label: 'Type', value: 'Internal user' },
    ])
  })

  it('reads a company link by its socid, with the truck icon for vendors', () => {
    const p = parseParty('<i class="fas fa-truck text-primary me-1"></i><a href="/societe/card.php?socid=7">Acme Supplies</a>')
    expect(p).toMatchObject({ kind: 'company', icon: 'truck', id: '7', name: 'Acme Supplies', photo: '', facts: [] })
  })

  it('returns null for the em dash the backend prints when nothing is linked', () => {
    expect(parseParty('<span class="text-muted">&mdash;</span>')).toBeNull()
  })
})

const KPI = (label: string, value: string, sub: string, cur = '') =>
  `<div class="col-xl"><div class="ec-report-stats"><div class="ec-report-stats-box"><div class="ec-report-stats-content"><div class="ec-report-stats-title">${label}</div><div class="ec-report-stats-value" style="color: #397db9;">${value} <div class="ec-report-stats-value-currency">${cur}</div></div><div class="ec-report-stats-sub">${sub}</div></div></div></div></div>`

const DASH = `<div class="row">${KPI('Total Expenses', '9', 'All time')}${KPI('Pending Approval', '0', 'Awaiting review')}${KPI('Total Amount', '74,524.00', 'Fully settled', 'ZMW')}</div>
<div class="card"><div class="card-header"><h6 class="card-title mb-0"><i class="fas fa-wallet me-2 text-primary"></i>Budget vs Used (2026)</h6></div><div class="card-body">
  BUDGETS
</div></div>
<div class="card"><div class="card-header"><h6 class="card-title mb-0">Recent Expenses</h6></div><div class="card-body p-0"><table><thead><tr><th>Ref</th></tr></thead><tbody>
<tr><td><a href="/expense/card.php?id=9"> Voxforem_Admin-ER00007-260901</a></td><td>Voxforem Admin</td><td class="text-end">200.00</td><td><span class="badge bg-info">Submitted</span></td><td><small>09/01/2026</small></td></tr>
<tr><td><a href="/expense/card.php?id=2"> PV2-PAY-4-16</a></td><td>Voxforem Admin</td><td class="text-end">14,144.00</td><td><span class="badge bg-dark">Paid</span></td><td><small>08/10/2026</small></td></tr>
</tbody></table></div></div>
<script>
var EXPENSE_DASH_DATA = {
    months:     ["Apr 2026","May 2026","Jun 2026","Jul 2026","Aug 2026","Sep 2026"],
    trend:      [0,0,0,0,74324,200],
    typeLabels: ["Other","Unknown","advertisement Expenses [old]"],
    typeData:   [38300,14144,240],
    currency:   'ZMW'
};
</script>`

describe('parseExpenseDashboard', () => {
  it('reads the KPI cards, the chart data and the recent expenses as printed', () => {
    const d = parseExpenseDashboard(DASH.replace('BUDGETS', '<div class="text-center text-muted py-4">No budgets set for this year.<a href="/expense/budgets.php">Set Budgets</a></div>'))
    expect(d.kpis).toEqual([
      { label: 'Total Expenses', value: '9', currency: '', sub: 'All time' },
      { label: 'Pending Approval', value: '0', currency: '', sub: 'Awaiting review' },
      { label: 'Total Amount', value: '74,524.00', currency: 'ZMW', sub: 'Fully settled' },
    ])
    expect(d.months).toHaveLength(6)
    expect(d.trend).toEqual([0, 0, 0, 0, 74324, 200])
    expect(d.typeLabels).toEqual(['Other', 'Unknown', 'advertisement Expenses [old]'])
    expect(d.typeData).toEqual([38300, 14144, 240])
    expect(d.currency).toBe('ZMW')
    expect(d.budgetYear).toBe('2026')
    expect(d.budgets).toEqual([])
    expect(d.recent).toEqual([
      { id: '9', ref: 'Voxforem_Admin-ER00007-260901', user: 'Voxforem Admin', amount: '200.00', status: 'Submitted', date: '09/01/2026' },
      { id: '2', ref: 'PV2-PAY-4-16', user: 'Voxforem Admin', amount: '14,144.00', status: 'Paid', date: '08/10/2026' },
    ])
  })

  it('reads the budget bars when budgets are set', () => {
    const bar =
      '<div class="mb-3"><div class="d-flex justify-content-between small mb-1"><span>Travel</span><span class="text-warning">72.5% (1,450.00 / 2,000.00)</span></div><div class="progress"></div></div>'
    expect(parseExpenseDashboard(DASH.replace('BUDGETS', bar)).budgets).toEqual([{ label: 'Travel', pct: 72.5, used: '1,450.00', budget: '2,000.00' }])
  })
})

const APPROVAL = (id: number, linked: string) =>
  `<tr><td>${id}</td><td><a href="/expense/card.php?id=${id}" class="fw-semibold"> ER-${id}</a></td><td>Voxforem Admin</td><td>09/01/2026 – 09/01/2026</td><td>${linked}</td><td class="text-end fw-semibold">200.00</td><td><span class="badge badge-status1 badge-status">Submitted</span></td><td><a href="/expense/card.php?id=${id}#approvals" class="btn">Review</a></td></tr>`

describe('parseApprovals', () => {
  it('reads each report awaiting approval with who it is linked to', () => {
    const rows = parseApprovals(
      `<table id="approvals-table"><thead><tr><th>#</th></tr></thead><tbody>${APPROVAL(9, USER_LINK)}${APPROVAL(5, '<span class="text-muted">&mdash;</span>')}</tbody></table>`,
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ id: '9', ref: 'ER-9', employee: 'Voxforem Admin', period: '09/01/2026 – 09/01/2026', totalTtc: '200.00', status: 'Submitted' })
    expect(rows[0].linkedTo?.name).toBe('Geno browin')
    expect(rows[1].linkedTo).toBeNull()
  })

  it('returns no rows when there is no table', () => {
    expect(parseApprovals('<p>Access denied</p>')).toEqual([])
  })
})

const PAYMENT = (id: number, advance: string, netCls: string, net: string, paid: string, action: string) =>
  `<tr><td>1</td><td><a href="/expense/card.php?id=${id}" class="fw-semibold"> ER-${id}</a></td><td>Voxforem Admin</td><td>08/21/2026 – 08/21/2026</td><td class="text-end fw-semibold">100.00</td><td class="text-end">${advance}</td><td class="text-end fw-semibold ${netCls}">${net}</td><td class="text-end fw-semibold">0.00</td><td><span class="badge badge-status6 badge-status">Approved</span></td><td><span class="badge">${paid}</span></td><td class="text-center">${action}</td></tr>`

describe('parsePayments', () => {
  it('reads what is owed, what was advanced, and what each row offers', () => {
    const { rows, note } = parsePayments(`<div class="alert alert-info">Approved expense reports pending or completed payment.</div><table id="payments-table"><tbody>
      ${PAYMENT(6, '-', 'text-primary', '100.00', 'Unpaid', `<button type="button" class="btn btn-sm btn-dark" onclick="openPaymentModal(6, 'ER-6', 100)"><i></i>Pay 100.00</button>`)}
      ${PAYMENT(7, '150.00', 'text-warning', '-50.00', 'Unpaid', '<a href="/expense/list.php?mainmenu=expences#repayments" class="btn">Collect 50.00</a>')}
      ${PAYMENT(8, '100.00', 'text-success', '0.00', 'Paid', '<span class="badge bg-success">Settled by advance</span>')}
    </tbody></table>`)
    expect(note).toBe('Approved expense reports pending or completed payment.')
    expect(rows.map((r) => [r.id, r.advance, r.netPayable, r.netTone, r.paid])).toEqual([
      ['6', '-', '100.00', 'owed', false],
      ['7', '150.00', '-50.00', 'surplus', false],
      ['8', '100.00', '0.00', 'settled', true],
    ])
    expect(rows[0].action).toEqual({ kind: 'pay', amount: 100, label: 'Pay 100.00' })
    expect(rows[1].action).toEqual({ kind: 'collect', label: 'Collect 50.00' })
    expect(rows[2].action).toEqual({ kind: 'settled', label: 'Settled by advance' })
  })
})

describe('parseExpenseCreateForm', () => {
  const FORM = `<form>
    <select id="fk_user_author" name="fk_user_author"><option value="12">Arthy  y (Master entity)</option><option value="1" selected>Voxforem  Admin (All entities)</option></select>
    <select id="fk_user_validator" name="fk_user_validator"><option value="-1">Select a users</option><option value="16">Geno browin (Master entity)</option></select>
    <select id="vatrate"><option value="16 (A)">16% (A)</option><option value="0 (C1)" selected>0% (C1)</option></select>
    <select id="edit_vatrate"><option value="99 (X)">99% (X)</option></select>
    <select id="fk_project" name="fk_project"><option value="0">Select a project</option><option value="1">PJ2606-0001, Application demo</option></select>
    <select id="et_vendor_select"><option value="-1">Select a third party</option><option value="2026">Auto One Zambia Limited | Tpin : 1</option></select>
    <select id="idprod"><option value="0" selected>Select Predefined Product/services</option><option value="1">001 - Product1</option></select>
    <div><span id="total-ttc">0.00</span> ZMW</div>
  </form>`

  it('reads the dropdown options the page prints, with the selected one', () => {
    const f = parseExpenseCreateForm(FORM)
    expect(f.authors).toEqual([
      { value: '12', label: 'Arthy y (Master entity)', selected: false },
      { value: '1', label: 'Voxforem Admin (All entities)', selected: true },
    ])
    expect(f.validators.map((o) => o.value)).toEqual(['-1', '16'])
    // The line-edit dialog has its own VAT select; only the input row's counts.
    expect(f.vatRates).toEqual([
      { value: '16 (A)', label: '16% (A)', selected: false },
      { value: '0 (C1)', label: '0% (C1)', selected: true },
    ])
    expect(f.projects.map((o) => o.label)).toEqual(['Select a project', 'PJ2606-0001, Application demo'])
    expect(f.vendors[1]).toMatchObject({ value: '2026' })
    expect(f.products).toHaveLength(2)
    expect(f.currency).toBe('ZMW')
  })

  it('trims a non-breaking-space option value to an empty one', () => {
    expect(parseExpenseCreateForm('<select id="fk_project"><option value=" ">&nbsp;</option></select>').projects[0].value).toBe('')
  })
})
