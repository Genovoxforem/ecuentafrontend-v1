// Parses payroll/ajax.php's two real cascading-select fragments behind
// payroll/atten_overall_rip.php's own Entity → Groups → Employee filters
// (confirmed live, both genuinely work with no CSRF issue — payroll/ajax.php
// defines NOCSRFCHECK itself, same as every other write action there):
//   - ?overallreport=<entityId>   → raw <option> HTML for the Groups select
//   - ?oallreport=1&entt=<e>&grup=<g> → raw HTML for the Employee select:
//     one flat "All Employees" option plus one <optgroup> per user group
//     (confirmed live — includes real blank-named users, kept as-is rather
//     than invented a display name).
// The report grid itself (payroll/ajax_get_attendance_rows.php) is a
// different matter — see OverallAttendanceReportForm.tsx's own comment.

export interface OverallAttendanceOption {
  value: string
  label: string
}

export interface OverallAttendanceEmployeeGroup {
  label: string
  options: OverallAttendanceOption[]
}

export interface OverallAttendanceEmployeeOptions {
  topLevel: OverallAttendanceOption[]
  groups: OverallAttendanceEmployeeGroup[]
}

export function parseOverallAttendanceGroupOptions(html: string): OverallAttendanceOption[] {
  const doc = new DOMParser().parseFromString(`<select>${html}</select>`, 'text/html')
  return Array.from(doc.querySelectorAll('option')).map((o) => ({
    value: o.getAttribute('value') ?? '',
    label: (o.textContent ?? '').trim(),
  }))
}

export function parseOverallAttendanceEmployeeOptions(html: string): OverallAttendanceEmployeeOptions {
  const doc = new DOMParser().parseFromString(`<select>${html}</select>`, 'text/html')
  const select = doc.querySelector('select')
  const topLevel: OverallAttendanceOption[] = []
  const groups: OverallAttendanceEmployeeGroup[] = []

  Array.from(select?.children ?? []).forEach((el) => {
    if (el.tagName === 'OPTION') {
      topLevel.push({ value: el.getAttribute('value') ?? '', label: (el.textContent ?? '').trim() })
    } else if (el.tagName === 'OPTGROUP') {
      const options = Array.from(el.querySelectorAll('option')).map((o) => ({
        value: o.getAttribute('value') ?? '',
        label: (o.textContent ?? '').trim() || '(no name)',
      }))
      groups.push({ label: el.getAttribute('label') ?? '', options })
    }
  })

  return { topLevel, groups }
}
