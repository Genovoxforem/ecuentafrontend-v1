import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { reportError } from '../shared/errorReporter'
import { NOT_SIGNED_IN_MESSAGE } from '../shared/legacyHtmlFetch'

// A 4xx answer (a missing endpoint, no access, a bad request) or a lost legacy
// session won't change by asking
// again - retrying it only adds 1s + 2s + 4s of waiting. Network failures and 5xx
// answers still get the retries.
function isPermanentHttpError(error: unknown): boolean {
  // The legacy session is gone: asking again returns the login page again.
  if (error instanceof Error && error.message === NOT_SIGNED_IN_MESSAGE) return true
  const status = (error as { response?: { status?: number } })?.response?.status
  if (typeof status === 'number') return status >= 400 && status < 500 && status !== 408 && status !== 429
  const m = error instanceof Error ? /returned (\d{3})\b/.exec(error.message) : null
  const fromMessage = m ? Number(m[1]) : 0
  return fromMessage >= 400 && fromMessage < 500 && fromMessage !== 408 && fromMessage !== 429
}

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
      retry: (failureCount, error) => failureCount < 3 && !isPermanentHttpError(error),
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
