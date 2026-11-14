import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// "Latest activation date / IP" of the classic module dialog: the constant MAIN_MODULE_<NAME> that switching the module on writes. Its note holds
// {"authorid":N,"ip":"..."} and the row's `modified` (tms) is the date (blank on newecuenta for MAIN_MODULE_USER, as on the classic dialog).
// Read from admin/fapi/consts.php?search_name=. <NAME> is the class name without "mod", upper-cased.
export interface ModuleActivation {
  found: boolean
  date: string
  ip: string
}

export const activationConstName = (className: string) => `MAIN_MODULE_${className.replace(/^mod/i, '').toUpperCase()}`

interface ConstRow {
  name: string
  note?: string | null
  modified?: string | null
}

export async function fetchModuleActivation(className: string): Promise<ModuleActivation> {
  const name = activationConstName(className)
  const d = await fapiGet<{ items?: ConstRow[] }>('/admin/fapi/consts.php', { search_name: name })
  const row = (d.items ?? []).find((r) => r.name === name)
  if (!row) return { found: false, date: '', ip: '' }
  let ip = ''
  try {
    ip = String((JSON.parse(row.note ?? '{}') as { ip?: unknown }).ip ?? '')
  } catch {
    ip = ''
  }
  return { found: true, date: row.modified ? row.modified.replace('T', ' ').replace(/Z$/, '') : '', ip }
}

export function useModuleActivation(className: string) {
  return useQuery({ queryKey: ['admin', 'module-activation', className], queryFn: () => fetchModuleActivation(className), staleTime: 1000 * 60 })
}
