import { useQuery } from '@tanstack/react-query'
import { loadPosConsts } from './posAdminShared'

// How many Terminal tabs the page shows: TAKEPOS_NUM_TERMINALS, read from takepos/fapi/settings.php on its own so the tab bar does not wait for the
// Parameters tab, which also reads the (slower) classic page for its option lists. The last known count is kept for the session, so the bar
// is complete on the first paint when the page is opened again.
const KEY = 'pos-admin.terminal-count'
const remembered = (): number | undefined => {
  try {
    const n = Number(sessionStorage.getItem(KEY))
    return Number.isFinite(n) && n >= 1 ? n : undefined
  } catch {
    return undefined
  }
}

export function useTerminalCount() {
  return useQuery({
    queryKey: ['pos-admin', 'terminal-count'],
    queryFn: async (): Promise<number> => {
      const consts = await loadPosConsts()
      const n = Number.parseInt(consts?.TAKEPOS_NUM_TERMINALS ?? '', 10)
      const count = Number.isFinite(n) ? Math.min(Math.max(n, 1), 20) : 1
      try {
        sessionStorage.setItem(KEY, String(count))
      } catch {
        /* storage unavailable: the count is just not remembered */
      }
      return count
    },
    initialData: remembered,
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 30,
  })
}
