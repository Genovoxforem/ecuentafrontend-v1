import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bindAutomatically, loadBindingOverview, overviewKindOf } from './bindingOverviewFapi'

// The binding overview of customer invoices, vendor invoices and expense reports: the lines bound and still to bind per account and month, from
// accountancy/fapi/binding_customer.php | binding_vendor.php | binding_expensereport.php (action=by_account_month, bindingOverviewFapi.ts).
export function useBindingIndex(path: string, year: number) {
  return useQuery({
    queryKey: ['generalLedger', 'bindingIndex', path, year],
    queryFn: async () => {
      const kind = overviewKindOf(path)
      if (!kind) throw new Error(`No binding overview is known for ${path}.`)
      return loadBindingOverview(kind, year)
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

// "Bind Automatically": the same file's automatic action; it binds every line whose product has an accounting account and answers with the message that
// is reported.
export function useBindAutomatically(path: string, year: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const kind = overviewKindOf(path)
      if (!kind) throw new Error(`No automatic binding is known for ${path}.`)
      return bindAutomatically(kind, year)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
