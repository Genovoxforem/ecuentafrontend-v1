import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from './bindLines.queries'
import { cellText } from './legacyTable'

// accountancy/admin/index.php — "Configuration of the module accounting".
// Two kinds of setting on one page, both confirmed live against 172.16.5.10:
//   - on/off switches: a link `index.php?token=…&action=set<NAME>&value=0|1`
//     whose icon (fa-toggle-on / fa-toggle-off) is the current state and whose
//     `value` is the state a click switches to;
//   - values (account lengths, start-binding date, default transfer period):
//     inputs of one POST form (token, action=update) sent together by "Modify".

export type SettingKind = 'toggle' | 'text' | 'date' | 'select'

export interface SettingRow {
  kind: SettingKind
  label: string
  name: string
  value: string // current value ('1'/'0' for a toggle)
  href: string // toggle: the backend link that flips it
  options: { value: string; label: string }[]
}

export interface GeneralSettings {
  token: string
  rows: SettingRow[]
}

const PATH = '/accountancy/admin/index.php'

export function parseGeneralSettings(doc: Document): GeneralSettings {
  const rows: SettingRow[] = []
  for (const tr of Array.from(doc.querySelectorAll('tr.oddeven'))) {
    if (tr.children.length !== 2) continue
    const label = cellText(tr.children[0])
    const control = tr.children[1]

    const link = control.querySelector<HTMLAnchorElement>('a[href*="action=set"]')
    if (link && control.querySelector('.fa-toggle-on, .fa-toggle-off')) {
      const href = link.getAttribute('href') ?? ''
      const params = new URLSearchParams(href.split('?')[1] ?? '')
      rows.push({ kind: 'toggle', label, name: params.get('action') ?? '', value: control.querySelector('.fa-toggle-on') ? '1' : '0', href, options: [] })
      continue
    }
    const select = control.querySelector<HTMLSelectElement>('select[name]')
    if (select) {
      rows.push({ kind: 'select', label, name: select.name, value: select.value, href: '', options: Array.from(select.options).map((o) => ({ value: o.value, label: cellText(o) })) })
      continue
    }
    const input = control.querySelector<HTMLInputElement>('input[type="text"][name]')
    if (input) rows.push({ kind: /date/i.test(input.name) ? 'date' : 'text', label, name: input.name, value: input.value, href: '', options: [] })
  }
  return { token: doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? '', rows }
}

export function useGeneralSettings() {
  return useQuery({
    queryKey: ['generalLedger', 'generalSettings'],
    queryFn: async () => parseGeneralSettings(await fetchLegacyDocument(PATH)),
    staleTime: 0,
  })
}

async function send(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, { credentials: 'same-origin', ...init })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const msgs = toastMessages(html)
  const err = msgs.find((m) => m.type === 'error')
  if (err) throw new Error(err.message)
  return msgs.map((m) => m.message).join('\n')
}

// Flip one on/off setting by following the backend's own link.
export function useToggleSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (row: SettingRow) => send(row.href),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

// The "Modify" button: posts the value settings together, as the page does.
export function useSaveSettingValues() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ token, values }: { token: string; values: Record<string, string> }) => {
      const body = new URLSearchParams({ token, action: 'update' })
      for (const [name, value] of Object.entries(values)) {
        body.set(name, value)
        const m = name.match(/DATE/) ? value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) : null
        if (name.match(/DATE/)) {
          body.set(`${name}day`, m?.[2] ?? '')
          body.set(`${name}month`, m?.[1] ?? '')
          body.set(`${name}year`, m?.[3] ?? '')
        }
      }
      return send(PATH, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
