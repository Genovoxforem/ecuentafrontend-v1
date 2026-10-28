// Parses payroll/over_time.php — a plain GET-able classic report (its own
// <form method="POST"> has no `action`, and the PHP reads
// `nameIN`/`searchBydate` via $_REQUEST, so GET works). Entity scoping is
// automatic server-side (the WHERE clause adds `AND lu.entity =
// $conf->entity` only for a non-master entity) — there's no user-facing
// entity control on this page at all, unlike its sibling reports. Columns:
// Date/Employee/Attendance/Clock In/Clock Out/Overtime, one row per
// attendance record with `overtime > 0` on the chosen date —
// server-rendered straight into <tbody>, not a DataTables AJAX source (the
// search/pagination chrome on the classic page is a client-side
// enhancement over these same rows).

export interface OvertimeListRow {
  date: string
  employee: string
  attendance: string
  clockIn: string
  clockOut: string
  overtime: string
}

export function parseOvertimeList(html: string): OvertimeListRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('table#example')
  const rows: OvertimeListRow[] = []
  table?.querySelectorAll('tbody > tr').forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    if (tds.length < 6) return
    rows.push({
      date: (tds[0]?.textContent ?? '').trim(),
      employee: (tds[1]?.textContent ?? '').trim(),
      attendance: (tds[2]?.textContent ?? '').trim(),
      clockIn: (tds[3]?.textContent ?? '').trim(),
      clockOut: (tds[4]?.textContent ?? '').trim(),
      overtime: (tds[5]?.textContent ?? '').trim(),
    })
  })
  return rows
}
