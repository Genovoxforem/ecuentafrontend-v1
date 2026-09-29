// Parses admin/defaultvalues.php (Setup > Default values/filters/sorting), one page per
// `mode` (createform, filters, sortorder, focus, mandatory). Verified against the dev
// backend and the page's own PHP:
//   - the "enable customization" switch is a GET link
//     `?action=setMAIN_ENABLE_DEFAULT_VALUES&token=…&value=<0|1>&mode=…` whose value is the
//     state it would switch TO (value=0 while enabled);
//   - the first `tr.oddeven` holds the add form (`defaulturl`, `defaultkey`,
//     `defaultvalue`, hidden `mode`, submit `add`; its `entity` input is disabled and the
//     server ignores it — it inserts with the session's entity);
//   - each further `tr.oddeven` is a rule: page, field, value (not shown for the focus and
//     mandatory modes), environment, then edit and delete links
//     `?rowid=<id>&entity=<entity>&mode=<mode>&action=delete&token=…`.

export interface DefaultValueRule {
  rowId: string
  page: string
  field: string
  // null for the modes whose table has no value column.
  value: string | null
  entity: string
}

export interface DefaultValuesPage {
  token: string
  mode: string
  enabled: boolean
  hasValue: boolean
  rules: DefaultValueRule[]
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseDefaultValuesPage(doc: Document): DefaultValuesPage {
  const addInput = doc.querySelector('input[name="defaulturl"]')
  const token = doc.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? ''
  if (!addInput || !token) throw new Error('The default values on this backend page were not recognised.')

  const toggle = doc.querySelector<HTMLAnchorElement>('a[href*="action=setMAIN_ENABLE_DEFAULT_VALUES"]')
  const enabled = toggle ? /[?&]value=0(?:&|$)/.test(toggle.getAttribute('href') ?? '') : false

  const table = addInput.closest('table')

  const rules: DefaultValueRule[] = []
  const hasValue = !!doc.querySelector('input[name="defaultvalue"]')
  table?.querySelectorAll('tr.oddeven').forEach((tr) => {
    if (tr.querySelector('input[name="defaulturl"]')) return
    const del = tr.querySelector('a[href*="action=delete"]')?.getAttribute('href') ?? ''
    const rowId = del.match(/[?&]rowid=(\d+)/)?.[1]
    if (!rowId) return
    const cells = Array.from(tr.querySelectorAll(':scope > td'))
    rules.push({
      rowId,
      page: clean(cells[0]?.textContent),
      field: clean(cells[1]?.textContent),
      value: hasValue ? clean(cells[2]?.textContent) : null,
      entity: del.match(/[?&]entity=(\d+)/)?.[1] ?? '',
    })
  })

  return {
    token,
    mode: doc.querySelector<HTMLInputElement>('input[name="mode"]')?.getAttribute('value') ?? '',
    enabled,
    hasValue,
    rules,
  }
}
