import { describe, expect, it } from 'vitest'
import { parsePayrollTable } from './payrollLegacyTable'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Markup copied from the real payroll/shifts.php (the edit panel trimmed).
const SHIFTS =
  '<table id="example" class="table"><thead><tr><th>Shift Name</th><th>Shift Type</th><th>Created By</th><th class="hideonexport">Action</th></tr></thead><tbody>' +
  '<tr id="Row2"><td>Holiday shift</td><td>holidayshift</td><td> </td><td>' +
  '<a data-bs-toggle="offcanvas" data-bs-target="#editHour2" data-geo="Edit"><i class="fa"></i></a>&nbsp;' +
  '<a href="shift_employees.php?shift_id=2" title="View assigned employees"><i class="fa"></i></a>' +
  '<div class="offcanvas" id="editHour2"><h5>Edit Shift Details</h5><input value="Holiday shift"></div></td></tr>' +
  '<tr id="Row3"><td>Morning</td><td>Fixed</td><td>Voxforem Admin</td><td><a data-bs-target="#editHour3">edit</a></td></tr>' +
  '</tbody></table>'

describe('parsePayrollTable', () => {
  it('reads the headers, one row per record, its id, and leaves the action column out', () => {
    const t = parsePayrollTable(parse(SHIFTS))
    expect(t.headers).toEqual(['Shift Name', 'Shift Type', 'Created By', 'Action'])
    expect(t.actionIndex).toBe(3)
    expect(t.rows).toEqual([
      { id: '2', cells: ['Holiday shift', 'holidayshift', '', ''] },
      { id: '3', cells: ['Morning', 'Fixed', 'Voxforem Admin', ''] },
    ])
  })

  it('finds the id from a handler or the edit panel when the row has no id attribute', () => {
    const html =
      '<table id="example"><thead><tr><th>Employee Name</th><th>Action</th></tr></thead><tbody>' +
      '<tr><td>Ann</td><td><a onclick="deletefun(41)">del</a></td></tr>' +
      '<tr><td>Bob</td><td><a data-bs-target="#editModal52">edit</a></td></tr></tbody></table>'
    expect(parsePayrollTable(parse(html)).rows.map((r) => r.id)).toEqual(['41', '52'])
  })

  it('returns no rows for an empty table, skips a "no data" row, and refuses a page with no table', () => {
    const empty = '<table id="example"><thead><tr><th>Sl</th><th>Leave</th></tr></thead><tbody></tbody></table>'
    expect(parsePayrollTable(parse(empty)).rows).toEqual([])
    const noData = '<table id="example"><thead><tr><th>Sl</th><th>Leave</th></tr></thead><tbody><tr><td colspan="2">No data</td></tr></tbody></table>'
    expect(parsePayrollTable(parse(noData)).rows).toEqual([])
    expect(() => parsePayrollTable(parse('<div>nothing</div>'))).toThrow(/not recognised/)
  })
})
