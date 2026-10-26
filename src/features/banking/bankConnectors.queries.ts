import { useQuery } from '@tanstack/react-query'
import { loadRevolutStatus } from './revolutFapi'
import { loadStripePayouts, loadStripeTransactions } from './stripeFapi'

// Stripe and Revolut answer a 409 until the module / schema is set up: that is the answer shown, so none of these retries it.
export const useStripeTransactions = () => useQuery({ queryKey: ['banking', 'stripe', 'transactions'], queryFn: loadStripeTransactions, retry: false, staleTime: 1000 * 60 })
export const useStripePayouts = () => useQuery({ queryKey: ['banking', 'stripe', 'payouts'], queryFn: loadStripePayouts, retry: false, staleTime: 1000 * 60 })
export const useRevolutStatus = () => useQuery({ queryKey: ['banking', 'revolut', 'status'], queryFn: loadRevolutStatus, retry: false, staleTime: 1000 * 60 })
