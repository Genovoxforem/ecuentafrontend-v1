import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadValidateMovements, validateMovements } from './closureFapi'

// accountancy/fapi/validate_movements.php (+ annual_closure.php for the monthly counts).
const KEY = ['generalLedger', 'validateMovements'] as const

export function useValidateMovements(year: number) {
  return useQuery({
    queryKey: [...KEY, 'fapi', year],
    queryFn: () => loadValidateMovements(year),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

// Validates the year's movements for good (they can no longer be changed or deleted); resolves to how many were locked.
export function useRequestValidation(year: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => validateMovements(year),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
