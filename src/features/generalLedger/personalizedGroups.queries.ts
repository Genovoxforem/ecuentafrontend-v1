import { useQuery } from '@tanstack/react-query'
import { loadGroupAccounts } from './personalizedGroupsFapi'

// The accounts of one personalized group (accountancy/fapi/personalized_groups.php?action=get + members).
export function useGroupAccounts(id: number) {
  return useQuery({
    queryKey: ['generalLedger', 'personalizedGroups', 'accounts', id],
    queryFn: ({ signal }) => loadGroupAccounts(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}
