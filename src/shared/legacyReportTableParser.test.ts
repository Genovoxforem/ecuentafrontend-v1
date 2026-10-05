import { describe, expect, it } from 'vitest'
import { parseReportTable, parseSelectOptions } from './legacyReportTableParser'

// Markup copied from live payroll/napsa_report.php and employer_contribution.php responses.
const NAPSA_EMPTY = `<table id="modified_export_table" class="table"><thead><tr><th>Sl.No</th><th>Account Number</th><th>Employee Share</th></tr></thead>
<tbody><!-- Display total --><tr><td></td><td style="text-align: left; "> <strong>Total : 0</strong></td><td colspan="2"><strong>Total :0</strong></td></tr></tbody></table>`

const CONTRIBUTION = `<table id="example" class="table"><thead><tr><th>Month</th><th>Account Type</th><th>Amount</th></tr></thead><tbody>
<tr><td>January  2026</td><td>
  <div>NAPSA</div>
  <div>NHIMA</div></td><td><div>50.00</div><div>25.00</div></td></tr></tbody></table>`

describe('parseReportTable', () => {
  it('reads headers and total rows', () => {
    const t = parseReportTable(NAPSA_EMPTY, 'table#modified_export_table')
    expect(t.headers).toEqual(['Sl.No', 'Account Number', 'Employee Share'])
    expect(t.rows).toEqual([['', 'Total : 0', 'Total :0']])
  })

  it('keeps multi-line cells as newline-separated text', () => {
    const t = parseReportTable(CONTRIBUTION, 'table#example')
    expect(t.rows).toEqual([['January 2026', 'NAPSA\nNHIMA', '50.00\n25.00']])
  })

  it('returns nothing when the table is missing', () => {
    expect(parseReportTable('<p>nope</p>', 'table#example')).toEqual({ headers: [], rows: [] })
  })
})

describe('parseSelectOptions', () => {
  const doc = new DOMParser().parseFromString('<select id="s"><option value="0">All</option><option value="2">Holiday shift</option><option value="">x</option></select>', 'text/html')
  it('skips blank values and optionally the 0/All entry', () => {
    expect(parseSelectOptions(doc, '#s')).toHaveLength(2)
    expect(parseSelectOptions(doc, '#s', false)).toEqual([{ value: '2', label: 'Holiday shift' }])
  })
})
