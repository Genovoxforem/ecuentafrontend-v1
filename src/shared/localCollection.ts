import { useQuery, useQueryClient } from '@tanstack/react-query'

// For modules with no backend endpoint at all (see each feature's
// queries.ts for which ones). Holds a summary object in react-query's
// cache under a fixed key, seeded once with `initial` and never fetched
// over the network (staleTime/gcTime: Infinity, queryFn just returns the
// seed). "Create" actions mutate it via queryClient.setQueryData, which
// react-query then broadcasts to every component reading that key — so
// list pages update immediately after a create, same as real data would,
// without persisting anywhere or surviving a page reload.
export function useLocalCollection<T>(key: readonly unknown[], initial: T) {
  const queryClient = useQueryClient()
  const { data } = useQuery<T>({
    queryKey: key as unknown[],
    queryFn: () => initial,
    initialData: initial,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  function update(updater: (current: T) => T) {
    queryClient.setQueryData<T>(key as unknown[], (current) => updater(current ?? initial))
  }

  // `initialData` guarantees `data` is always defined; react-query's types
  // don't always propagate that, so this asserts what's already true.
  return [data as T, update] as const
}

let sequence = 1
// Local-only records need *some* stable id/ref for React keys and display
// — this stands in for what a real backend's autoincrement/sequence would
// assign.
export function nextLocalRef(prefix: string) {
  return `${prefix}-${String(sequence++).padStart(5, '0')}`
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
