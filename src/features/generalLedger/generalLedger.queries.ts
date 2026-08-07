import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'

export interface LedgerEntry {
  transactionNum: string
  journal: string
  date: string
  accountingDoc: string
  label: string
  currencyCode: string
  debit: number
  credit: number
}

export interface LedgerMovement {
  debit: number
  credit: number
  balance: number
  balanceSide: 'Dr' | 'Cr'
}

export interface LedgerSummary {
  year: number
  entries: LedgerEntry[]
  periodMovements: LedgerMovement
  closingBalance: LedgerMovement
}

function toMovement(entries: LedgerEntry[]): LedgerMovement {
  const debit = entries.reduce((sum, e) => sum + e.debit, 0)
  const credit = entries.reduce((sum, e) => sum + e.credit, 0)
  const balance = debit - credit
  return { debit, credit, balance: Math.abs(balance), balanceSide: balance >= 0 ? 'Dr' : 'Cr' }
}

const KEY = ['local', 'ledgerEntries'] as const
const SEED: LedgerEntry[] = []

// No accountancy/bookkeeping endpoint exists on this app's server — this is
// real double-entry accounting data, and a convincing-looking fake ledger
// balance risks being mistaken for a real one in a way a fake room booking
// or stock count isn't. So this is explicitly demo/sandbox: entries typed
// in here are held in react-query's cache only (never sent anywhere, never
// persisted past a refresh) purely to show what the report layout looks
// like with data in it. See LedgerOverview.tsx's demo-mode banner.
export function useLedgerSummary() {
  const [entries] = useLocalCollection(KEY, SEED)
  const summary: LedgerSummary = {
    year: new Date().getFullYear(),
    entries,
    periodMovements: toMovement(entries),
    closingBalance: toMovement(entries),
  }
  return { data: summary, isError: false, isLoading: false }
}

export interface NewLedgerEntryInput {
  journal: string
  date: string
  accountingDoc: string
  label: string
  debit: number
  credit: number
}

export function useRecordDemoLedgerEntry() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (input: NewLedgerEntryInput) => {
    const entry: LedgerEntry = {
      transactionNum: nextLocalRef('DEMO-TX'),
      journal: input.journal,
      date: input.date || todayIso(),
      accountingDoc: input.accountingDoc,
      label: input.label,
      currencyCode: 'ZMW',
      debit: input.debit,
      credit: input.credit,
    }
    update((current) => [entry, ...current])
  }
}
