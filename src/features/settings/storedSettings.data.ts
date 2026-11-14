import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// Setup pages whose settings are plain constants (Alerts, Limits and accuracy, SMS): the classic page reads them and its edit form posts
// them back one by one. The names were read from the edit forms of newecuenta's admin/delais.php, limits.php and sms.php (6 Nov 2026).
//  - read: core/fapi/constants.php?names=A,B,C -> {values: {NAME: value | null}, missing: [names never set]} (admin only). A constant that is
//    not set is drawn with the value the classic form shows for it (Max decimals 5 / 2 / 8, "No" for Disable all SMS sending).
//  - write: admin/fapi/const_save.php {name, value, note, type}; it REPLACES the row and blanks a comment that is not sent (5 Nov 2026), so the
//    comment and type the constant already has are read first (admin/fapi/consts.php) and sent back. Only the settings that changed are saved.
export type StoredValues = Record<string, string>

interface ConstantsAnswer {
  values: Record<string, string | null>
  missing?: string[]
}

export function useStoredSettings(defaults: StoredValues) {
  const names = Object.keys(defaults)
  return useQuery({
    queryKey: ['settings', 'constants', 'stored', ...names],
    queryFn: async (): Promise<{ values: StoredValues; stored: StoredValues }> => {
      const d = await fapiGet<ConstantsAnswer>('/core/fapi/constants.php', { names: names.join(',') })
      const stored: StoredValues = {}
      const values: StoredValues = {}
      for (const name of names) {
        const v = d.values?.[name]
        if (v !== null && v !== undefined) stored[name] = String(v)
        values[name] = v !== null && v !== undefined ? String(v) : defaults[name]
      }
      return { values, stored }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}

interface StoredConstant {
  name: string
  note?: string | null
  type?: string
  visible?: number
}

// Saves the given constants one by one (the comment and type each one already has are read first and sent back). Returns how many were written.
export async function saveStoredSettings(changes: StoredValues): Promise<number> {
  let saved = 0
  for (const [name, value] of Object.entries(changes)) {
    const found = await fapiGet<{ items?: StoredConstant[] }>('/admin/fapi/consts.php', { search_name: name, limit: 100 })
    const current = found.items?.find((c) => c.name === name)
    await fapiPost('/admin/fapi/const_save.php', { name, value, note: current?.note ?? '', ...(current?.type ? { type: current.type } : {}), ...(current?.visible !== undefined ? { visible: current.visible } : {}) })
    saved += 1
  }
  return saved
}

export function useSaveStoredSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changes: StoredValues): Promise<number> => saveStoredSettings(changes),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'constants'] })
      void queryClient.invalidateQueries({ queryKey: ['settings', 'adminConstants'] })
    },
  })
}

// The settings of `current` that differ from what the page was loaded with.
export function changedSettings(loaded: StoredValues, current: StoredValues): StoredValues {
  const changes: StoredValues = {}
  for (const name of Object.keys(current)) if (current[name] !== loaded[name]) changes[name] = current[name]
  return changes
}
