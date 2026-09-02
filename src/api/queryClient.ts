import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { reportError } from '../shared/errorReporter'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lists change often but detail pages are relatively stable —
      // 30s default; individual queries override as needed (reference
      // data uses 10min, user lists 1h, etc.).
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 10,
      // Retry up to 3 times with exponential backoff (1s, 2s, 4s) —
      // avoids hammering the legacy backend on transient failures.
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Mutations don't retry by default — most legacy backend mutations
      // are not idempotent, so auto-retry could cause duplicate writes.
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      reportError(error, { source: 'queryCache', context: { queryKey: query.queryKey } })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      reportError(error, { source: 'mutationCache', context: { mutationKey: mutation.options.mutationKey } })
    },
  }),
})
