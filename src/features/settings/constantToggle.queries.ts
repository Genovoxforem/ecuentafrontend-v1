import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// Writes one on/off setting constant. The key-authenticated writers admin/fapi/const_save.php and const_delete.php (changelog 5 Nov 2026) are
// used: they need only the API key, like every other call of the app (the classic core/ajax/constantonoff.php is no longer called).
//
// const_save REPLACES the row and blanks a comment that is not sent (checked live 5 Nov 2026), so turning a switch on first reads the comment and
// type the constant already has (admin/fapi/consts.php) and sends them back. Turning it off is a delete, as in the classic page.
//
// Neither writer returns the stored value, so the position a switch starts in comes from core/fapi/constants.php (settingConstants.data.ts, read with
// the API key): every Setup switch is drawn from the stored value, not from an assumption.
interface Toggle {
  name: string
  on: boolean
  value?: string | number
}

interface StoredConstant {
  name: string
  note?: string | null
  type?: string
  visible?: number
}

async function writeWithApiKey({ name, on, value = '1' }: Toggle): Promise<void> {
  if (!on) {
    await fapiPost('/admin/fapi/const_delete.php', { name })
    return
  }
  const stored = await fapiGet<{ items?: StoredConstant[] }>('/admin/fapi/consts.php', { search_name: name, limit: 100 })
  const current = stored.items?.find((c) => c.name === name)
  await fapiPost('/admin/fapi/const_save.php', {
    name,
    value: String(value),
    note: current?.note ?? '',
    ...(current?.type ? { type: current.type } : {}),
    // const_save sets visible to 0 when it is not sent: keep what the row has (a classic-listed constant stays listed)
    ...(current?.visible !== undefined ? { visible: current.visible } : {}),
  })
}

export function useToggleConstant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (toggle: Toggle) => writeWithApiKey(toggle),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'constants'] })
      void queryClient.invalidateQueries({ queryKey: ['settings', 'adminConstants'] })
    },
  })
}
