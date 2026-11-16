import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assetGet, assetPost, fetchLedgerAccounts } from './assetService'
import type { SetupEntity, SetupList } from './assetModels'
import { ASSET_KEY, invalidateAssetData } from './assetList.data'

// asset/api/setup.php?entity=types|categories|groups|insurers&action=list answers {items, meta, extra}: meta.fields are the fields the
// backend has for the entity (a field that needs the asset v2 database update is left out and named in meta.schema_pending), meta.can_setup
// the right to change them, meta.global that the records are shared by every company; every item carries in_use (how many assets or
// invoices use it).
export function useSetupList(entity: SetupEntity) {
  return useQuery({
    queryKey: [...ASSET_KEY, 'setup', entity],
    queryFn: ({ signal }) => assetGet<SetupList>('setup.php', { entity, action: 'list' }, signal),
  })
}

// POST setup.php?entity=X {entity, action:'save'|'toggle'|'delete', id?, ...fields}; the answer's `message` is the toast text of the
// classic page ("Saved", ...).
export function useSetupWrite(entity: SetupEntity) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { action: 'save' | 'toggle' | 'delete'; body: Record<string, unknown> }) => assetPost<unknown>('setup.php', { ...v.body, entity, action: v.action }, { entity }),
    onSuccess: () => invalidateAssetData(queryClient),
  })
}

// The chart of accounts the ledger-account pickers search (accountancy/workspace/api/accounts.php?all=1, 370 accounts on newecuenta).
export function useLedgerAccounts() {
  return useQuery({ queryKey: [...ASSET_KEY, 'accounts'], queryFn: fetchLedgerAccounts, staleTime: 1000 * 60 * 10 })
}
